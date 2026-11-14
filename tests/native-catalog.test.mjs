import { test } from "node:test"
import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { readFile, writeFile, mkdtemp, rm, symlink } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { createPlatformServer } from "./helpers/platform-server.mjs"

test("authenticated catalog exposes actual bundled skill content and source revision", async () => {
  const platform = await createPlatformServer({
    distDir: ".next-native-catalog-test",
  })
  try {
    const url = `${platform.base}/api/native-catalog?kind=skill&q=quick`
    assert.equal((await fetch(url)).status, 401)
    execFileSync(process.execPath, ["scripts/setup-local.mjs"], {
      env: {
        ...platform.env,
        PENNY_ADMIN_USERNAME: "catalog-reader",
        PENNY_ADMIN_PASSWORD: "catalog-password-2026",
      },
    })
    const login = await fetch(`${platform.base}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: platform.base },
      body: JSON.stringify({
        username: "catalog-reader",
        password: "catalog-password-2026",
      }),
    })
    assert.equal(login.status, 200)
    const headers = { Cookie: login.headers.get("set-cookie").split(";")[0] }
    const response = await fetch(url, { headers })
    assert.equal(response.status, 200)
    const catalog = await response.json()
    assert.equal(
      catalog.source.commit,
      (await readFile("third_party/strix/STRIX_COMMIT", "utf8")).trim()
    )
    assert.equal(catalog.source.version, "1.7.0")
    const quick = catalog.items.find(
      (item) => item.id === "skill:scan_modes/quick.md"
    )
    assert.ok(quick)
    assert.equal(quick.selectable, false)
    assert.equal(
      quick.content,
      await readFile(
        "third_party/strix/strix/skills/scan_modes/quick.md",
        "utf8"
      )
    )
    assert.equal(quick.environment, "unverified")
    assert.deepEqual(catalog.usage, [])
  } finally {
    await platform.dispose()
  }
})

test("tool catalog distinguishes native functions, sandbox references and MCP configuration", async () => {
  const platform = await createPlatformServer({
    distDir: ".next-native-catalog-test",
  })
  try {
    execFileSync(process.execPath, ["scripts/setup-local.mjs"], {
      env: {
        ...platform.env,
        PENNY_ADMIN_USERNAME: "reader",
        PENNY_ADMIN_PASSWORD: "catalog-password-2026",
      },
    })
    const login = await fetch(`${platform.base}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: platform.base },
      body: JSON.stringify({
        username: "reader",
        password: "catalog-password-2026",
      }),
    })
    const headers = { Cookie: login.headers.get("set-cookie").split(";")[0] }
    const response = await fetch(
      `${platform.base}/api/native-catalog?kind=tool`,
      { headers }
    )
    assert.equal(response.status, 200)
    const catalog = await response.json()
    const note = catalog.items.find((item) => item.name === "create_note")
    assert.ok(note, "actual SDK function must appear")
    assert.equal(note.category, "native_function")
    assert.equal(note.source, "strix/tools/notes/tools.py")
    assert.match(note.content, /Document an observation/)
    assert.equal(note.environment, "unverified")
    const nmap = catalog.items.find((item) => item.id === "program:nmap")
    assert.ok(
      nmap,
      "sandbox program reference comes from bundled tooling instructions"
    )
    assert.equal(nmap.category, "sandbox_program")
    assert.equal(nmap.environment, "unverified")
    assert.deepEqual(catalog.mcp.connections, [])
    const filtered = await (
      await fetch(
        `${platform.base}/api/native-catalog?kind=tool&category=native_function&q=create_note`,
        { headers }
      )
    ).json()
    assert.deepEqual(
      filtered.items.map((item) => item.name),
      ["create_note"]
    )
    const detail = await (
      await fetch(
        `${platform.base}/api/native-catalog?id=${encodeURIComponent(note.id)}`,
        { headers }
      )
    ).json()
    assert.deepEqual(detail.items, [note])
  } finally {
    await platform.dispose()
  }
})

test("catalog usage comes from selected task events and identifies Agent without exposing arguments", async () => {
  const platform = await createPlatformServer({
    distDir: ".next-native-catalog-test",
  })
  try {
    execFileSync(process.execPath, ["scripts/setup-local.mjs"], {
      env: {
        ...platform.env,
        PENNY_ADMIN_USERNAME: "reader",
        PENNY_ADMIN_PASSWORD: "catalog-password-2026",
      },
    })
    const login = await fetch(`${platform.base}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: platform.base },
      body: JSON.stringify({
        username: "reader",
        password: "catalog-password-2026",
      }),
    })
    const headers = {
      Cookie: login.headers.get("set-cookie").split(";")[0],
      "Content-Type": "application/json",
      Origin: platform.base,
    }
    const created = await fetch(`${platform.base}/api/pentests`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        kind: "web_app_pentest",
        targets: ["https://example.com"],
      }),
    })
    assert.equal(created.status, 201)
    const { task } = await created.json()
    const url = `${platform.base}/api/native-catalog?taskId=${task.id}`
    assert.equal(
      (await (await fetch(url, { headers })).json()).usageStatus,
      "missing"
    )
    const events = Array.from({ length: 202 }, () => ({
      type: "status",
      data: { phase: "fixture" },
    }))
    events.push({
      type: "agent_event",
      at: "2026-11-13T01:00:00Z",
      agentId: "agent-a",
      data: {
        type: "run_item_stream_event",
        name: "tool_called",
        item: {
          raw_item: {
            type: "function_call",
            name: "create_note",
            call_id: "call-a",
            arguments: '{"content":"private-test-secret"}',
          },
        },
      },
    })
    events.push({
      type: "agent_event",
      at: "2026-11-13T01:01:00Z",
      agentId: "agent-b",
      data: {
        type: "raw_response_event",
        data: "ResponseOutputItemDoneEvent(item=ResponseFunctionToolCall(arguments='{}', call_id='call-b', name='list_notes', type='function_call'), type='response.output_item.done')",
      },
    })
    events.push({
      type: "agent_event",
      at: "2026-11-13T01:01:30Z",
      agentId: "agent-a",
      data: {
        type: "raw_response_event",
        data: "ResponseOutputItemDoneEvent(item=ResponseFunctionToolCall(arguments='{}', call_id='call-c', name='load_skill', type='function_call'), type='response.output_item.done')",
      },
    })
    events.push({
      type: "agent_event",
      at: "2026-11-13T01:02:00Z",
      agentId: "agent-a",
      data: {
        type: "run_item_stream_event",
        name: "tool_called",
        item: {
          raw_item: {
            type: "function_call",
            name: "load_skill",
            call_id: "call-c",
            arguments: '{"skills":["nmap"]}',
          },
        },
      },
    })
    await writeFile(
      `${platform.dataDir}/pentests/${task.id}/events.jsonl`,
      events.map((event) => JSON.stringify(event)).join("\n") + '\n{"type":'
    )
    await writeFile(
      `${platform.dataDir}/pentests/${task.id}/runtime-version.json`,
      JSON.stringify({
        commit: (
          await readFile("third_party/strix/STRIX_COMMIT", "utf8")
        ).trim(),
      })
    )
    const response = await fetch(url, { headers })
    assert.equal(response.status, 200)
    const content = await response.text()
    assert.ok(!content.includes("private-test-secret"))
    const catalog = JSON.parse(content)
    assert.equal(catalog.usageStatus, "read")
    const skillUsage = catalog.usage.find(
      (call) => call.itemId === "skill:tooling/nmap.md"
    )
    assert.ok(skillUsage, "later called event must add skill association")
    assert.equal(skillUsage.at, "2026-11-13T01:02:00Z")
    assert.equal(skillUsage.eventIndex, 205)
    assert.equal(
      catalog.usage.find((call) => call.itemId === "function:load_skill").at,
      "2026-11-13T01:02:00Z"
    )
    assert.equal(catalog.sourceMatchesTask, true)
    const note = catalog.usage.find((call) => call.callId === "call-a")
    assert.deepEqual(note, {
      taskId: task.id,
      agentId: "agent-a",
      at: "2026-11-13T01:00:00Z",
      eventIndex: 202,
      name: "create_note",
      itemId: "function:create_note",
      callId: "call-a",
      action: "called",
    })
    assert.equal(
      catalog.usage.find((call) => call.callId === "call-b").action,
      "requested"
    )
    assert.ok(
      catalog.usage.some(
        (call) =>
          call.itemId === "skill:tooling/nmap.md" && call.agentId === "agent-a"
      )
    )
    await writeFile(
      `${platform.dataDir}/pentests/${task.id}/runtime-version.json`,
      JSON.stringify({ commit: "different-historical-commit" })
    )
    const historical = await (await fetch(url, { headers })).json()
    assert.equal(historical.sourceMatchesTask, false)
    assert.equal(historical.taskSource.commit, "different-historical-commit")
    assert.ok(historical.usage.every((call) => call.itemId === null))
    assert.equal(
      (
        await fetch(`${platform.base}/api/native-catalog?taskId=../../`, {
          headers,
        })
      ).status,
      400
    )
    assert.equal(
      (
        await fetch(
          `${platform.base}/api/native-catalog?taskId=00000000-0000-4000-8000-000000000000`,
          { headers }
        )
      ).status,
      404
    )
  } finally {
    await platform.dispose()
  }
})

test("MCP declarations stay unverified, hide credentials and report configuration read errors", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "penny-catalog-mcp-"))
  const file = path.join(directory, "mcp.json")
  await writeFile(
    file,
    JSON.stringify([
      {
        name: "docs",
        transport: "http",
        url: "http://127.0.0.1:1",
        auth: { type: "bearer", token: "private-mcp-secret" },
        allowed_tools: ["lookup"],
      },
      { name: "unlisted", transport: "stdio", command: "must-not-execute" },
    ])
  )
  const platform = await createPlatformServer({
    distDir: ".next-native-catalog-test",
    env: { STRIX_MCP_CONFIG: file, STRIX_MCP_ONLY: "", STRIX_MCP_EXCLUDE: "" },
  })
  try {
    execFileSync(process.execPath, ["scripts/setup-local.mjs"], {
      env: {
        ...platform.env,
        PENNY_ADMIN_USERNAME: "reader",
        PENNY_ADMIN_PASSWORD: "catalog-password-2026",
      },
    })
    const login = await fetch(`${platform.base}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: platform.base },
      body: JSON.stringify({
        username: "reader",
        password: "catalog-password-2026",
      }),
    })
    const headers = { Cookie: login.headers.get("set-cookie").split(";")[0] }
    const response = await fetch(
      `${platform.base}/api/native-catalog?category=mcp_tool`,
      { headers }
    )
    assert.equal(response.status, 200)
    const text = await response.text()
    assert.ok(!text.includes("private-mcp-secret"))
    assert.ok(!text.includes("must-not-execute"))
    const catalog = JSON.parse(text)
    assert.deepEqual(catalog.mcp.connections, ["docs", "unlisted"])
    assert.deepEqual(
      catalog.items.map((item) => item.id),
      ["mcp:docs/lookup"]
    )
    assert.equal(catalog.items[0].environment, "unverified")
    const created = await fetch(`${platform.base}/api/pentests`, {
      method: "POST",
      headers: {
        ...headers,
        "Content-Type": "application/json",
        Origin: platform.base,
      },
      body: JSON.stringify({
        kind: "web_app_pentest",
        targets: ["https://example.com"],
      }),
    })
    assert.equal(created.status, 201)
    const { task } = await created.json()
    const events = [
      {
        type: "agent_event",
        agentId: "mcp-agent",
        at: "2026-11-14T01:00:00Z",
        data: {
          type: "run_item_stream_event",
          name: "tool_called",
          item: {
            raw_item: {
              type: "function_call",
              name: "search_mcp_tools",
              call_id: "discover-call",
              arguments: JSON.stringify({
                connection: "unlisted",
                query: "read",
              }),
            },
          },
        },
      },
      {
        type: "agent_event",
        agentId: "mcp-agent",
        at: "2026-11-14T01:00:01Z",
        data: {
          type: "run_item_stream_event",
          name: "tool_output",
          item: {
            raw_item: {
              type: "function_call_output",
              call_id: "discover-call",
            },
            output: {
              connection: "unlisted",
              matches: [
                { name: "read_doc", description: "private-mcp-secret" },
              ],
            },
          },
        },
      },
    ]
    await writeFile(
      `${platform.dataDir}/pentests/${task.id}/events.jsonl`,
      events.map((event) => JSON.stringify(event)).join("\n") + "\n"
    )
    const discoveredResponse = await fetch(
      `${platform.base}/api/native-catalog?category=mcp_tool&taskId=${task.id}`,
      { headers }
    )
    assert.equal(discoveredResponse.status, 200)
    const discoveredText = await discoveredResponse.text()
    assert.ok(!discoveredText.includes("private-mcp-secret"))
    const discovered = JSON.parse(discoveredText).items.find(
      (item) => item.id === "mcp:unlisted/read_doc"
    )
    assert.ok(
      discovered,
      "saved discovery output must add tools when allowed_tools is omitted"
    )
    assert.equal(discovered.evidence, "task_discovery")
    assert.equal(discovered.environment, "unverified")
    assert.equal(discovered.observation.agentId, "mcp-agent")
    assert.equal(discovered.observation.eventIndex, 1)
    await writeFile(file, "malformed")
    const failed = await (
      await fetch(`${platform.base}/api/native-catalog?category=mcp_tool`, {
        headers,
      })
    ).json()
    assert.equal(failed.mcp.status, "unreadable")
    assert.deepEqual(failed.items, [])
  } finally {
    await platform.dispose()
    await rm(directory, { recursive: true, force: true })
  }
})

test("catalog follows configured Strix checkout and reports its actual Git revision", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "penny-catalog-source-"))
  await symlink(
    path.resolve("third_party/strix/strix"),
    path.join(directory, "strix")
  )
  await writeFile(
    path.join(directory, "pyproject.toml"),
    '[project]\nname = "catalog-fixture"\nversion = "9.9.0"\n'
  )
  execFileSync("git", ["init", "-q", directory])
  execFileSync("git", ["-C", directory, "add", "pyproject.toml", "strix"])
  execFileSync("git", [
    "-C",
    directory,
    "-c",
    "user.name=Catalog Test",
    "-c",
    "user.email=catalog@example.test",
    "commit",
    "-qm",
    "fixture",
  ])
  const commit = execFileSync("git", ["-C", directory, "rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim()
  const platform = await createPlatformServer({
    distDir: ".next-native-catalog-test",
    env: { PENNY_STRIX_SOURCE: directory },
  })
  try {
    execFileSync(process.execPath, ["scripts/setup-local.mjs"], {
      env: {
        ...platform.env,
        PENNY_ADMIN_USERNAME: "reader",
        PENNY_ADMIN_PASSWORD: "catalog-password-2026",
      },
    })
    const login = await fetch(`${platform.base}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: platform.base },
      body: JSON.stringify({
        username: "reader",
        password: "catalog-password-2026",
      }),
    })
    const headers = { Cookie: login.headers.get("set-cookie").split(";")[0] }
    const response = await fetch(`${platform.base}/api/native-catalog`, {
      headers,
    })
    assert.equal(response.status, 200)
    const catalog = await response.json()
    assert.equal(catalog.source.commit, commit)
    assert.equal(catalog.source.version, "9.9.0")
  } finally {
    await platform.dispose()
    await rm(directory, { recursive: true, force: true })
  }
})

test("catalog uses the selected Strix interpreter when service PATH resolves an incompatible python3", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "penny-catalog-python-"))
  const python = execFileSync(
    "python3",
    ["-c", "import sys; print(sys.executable)"],
    { encoding: "utf8" }
  ).trim()
  await writeFile(path.join(directory, "python3"), "#!/bin/sh\nexit 71\n", {
    mode: 0o755,
  })
  const platform = await createPlatformServer({
    distDir: ".next-native-catalog-test",
    env: { PATH: `${directory}:/usr/bin:/bin`, PENNY_STRIX_PYTHON: python },
  })
  try {
    execFileSync(process.execPath, ["scripts/setup-local.mjs"], {
      env: {
        ...platform.env,
        PENNY_ADMIN_USERNAME: "reader",
        PENNY_ADMIN_PASSWORD: "catalog-password-2026",
      },
    })
    const login = await fetch(`${platform.base}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: platform.base },
      body: JSON.stringify({
        username: "reader",
        password: "catalog-password-2026",
      }),
    })
    const headers = { Cookie: login.headers.get("set-cookie").split(";")[0] }
    const response = await fetch(`${platform.base}/api/native-catalog`, {
      headers,
    })
    assert.equal(response.status, 200)
    assert.ok(
      (await response.json()).items.some(
        (item) => item.id === "function:create_note"
      )
    )
  } finally {
    await platform.dispose()
    await rm(directory, { recursive: true, force: true })
  }
})
