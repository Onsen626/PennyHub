import { execFileSync } from "node:child_process"
import { createPlatformServer } from "./helpers/platform-server.mjs"
import { test, after } from "node:test"
import assert from "node:assert/strict"
import http from "node:http"
const platform = await createPlatformServer()
const { base, env } = platform
const startServer = platform.start
const stopServer = platform.stop
after(platform.dispose)
test("unauthenticated access redirects pages and rejects configuration APIs", async () => {
  const page = await fetch(base, { redirect: "manual" })
  assert.equal(page.status, 307, platform.logs().slice(-3000))
  assert.equal(new URL(page.headers.get("location"), base).pathname, "/login")
  const api = await fetch(`${base}/api/model-config`)
  assert.equal(api.status, 401)
  assert.equal((await api.json()).error.code, "UNAUTHENTICATED")
})

let cookie = ""
const password = "Penny-API-test-password-2026"
test("local administrator can login, read session, and logout revokes the cookie", async () => {
  execFileSync(process.execPath, ["scripts/setup-local.mjs"], {
    env: {
      ...env,
      PENNY_ADMIN_USERNAME: "tester",
      PENNY_ADMIN_PASSWORD: password,
    },
  })
  const invalid = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: base },
    body: JSON.stringify({ username: "tester", password: "wrong" }),
  })
  assert.equal(invalid.status, 401)
  const login = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: base },
    body: JSON.stringify({ username: "tester", password }),
  })
  assert.equal(login.status, 200)
  assert.match(login.headers.get("set-cookie"), /HttpOnly/i)
  cookie = login.headers.get("set-cookie").split(";")[0]
  assert.equal(
    (
      await (
        await fetch(`${base}/api/auth/session`, { headers: { Cookie: cookie } })
      ).json()
    ).username,
    "tester"
  )
  assert.equal(
    (await fetch(base, { headers: { Cookie: cookie }, redirect: "manual" }))
      .status,
    200
  )
  assert.equal(
    (
      await fetch(`${base}/api/auth/logout`, {
        method: "POST",
        headers: { Cookie: cookie },
      })
    ).status,
    200
  )
  assert.equal(
    (await fetch(`${base}/api/auth/session`, { headers: { Cookie: cookie } }))
      .status,
    401
  )
})
test("saved model configuration survives reload and never returns its API key", async () => {
  const login = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: base },
    body: JSON.stringify({ username: "tester", password }),
  })
  cookie = login.headers.get("set-cookie").split(";")[0]
  const headers = { "Content-Type": "application/json", Cookie: cookie }
  const saved = await fetch(`${base}/api/model-config`, {
    method: "PUT",
    headers,
    body: JSON.stringify({
      baseUrl: "http://127.0.0.1:9876/v1",
      model: "test-model",
      apiKey: "test-only-secret-002",
    }),
  })
  assert.equal(saved.status, 200)
  const text = await (
    await fetch(`${base}/api/model-config`, { headers })
  ).text()
  assert.ok(!text.includes("test-only-secret-002"))
  assert.deepEqual(JSON.parse(text), {
    configured: true,
    baseUrl: "http://127.0.0.1:9876/v1",
    model: "test-model",
    hasApiKey: true,
    updatedAt: JSON.parse(text).updatedAt,
  })
  assert.equal(
    (
      await fetch(`${base}/api/model-config`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          baseUrl: "file:///tmp/key",
          model: "test-model",
        }),
      })
    ).status,
    400
  )
})

test("model connection test uses real HTTP and classifies provider errors without leaking secrets", async () => {
  let status = 200,
    payload = { choices: [{ message: { content: "fixture response" } }] }
  const requests = []
  const upstream = http.createServer(async (req, res) => {
    let text = ""
    for await (const chunk of req) text += chunk
    requests.push({
      path: req.url,
      auth: req.headers.authorization,
      body: JSON.parse(text),
    })
    res.writeHead(status, { "Content-Type": "application/json" })
    res.end(JSON.stringify(payload))
  })
  await new Promise((resolve) => upstream.listen(0, "127.0.0.1", resolve))
  const endpoint = `http://127.0.0.1:${upstream.address().port}/v1`
  const probe = () =>
    fetch(`${base}/api/model-config/test`, {
      method: "POST",
      headers: { Cookie: cookie, "Content-Type": "application/json" },
      body: JSON.stringify({
        baseUrl: endpoint,
        model: "fixture-model",
        apiKey: "fixture-secret",
      }),
    })
  try {
    const good = await probe()
    assert.equal(good.status, 200)
    assert.equal((await good.json()).ok, true)
    assert.equal(requests[0].path, "/v1/chat/completions")
    assert.equal(requests[0].auth, "Bearer fixture-secret")
    assert.equal(requests[0].body.model, "fixture-model")
    for (const [httpStatus, expectedStatus, code] of [
      [401, 422, "MODEL_AUTH_FAILED"],
      [403, 422, "MODEL_AUTH_FAILED"],
      [404, 422, "MODEL_NOT_FOUND"],
      [429, 429, "MODEL_RATE_LIMITED"],
      [500, 502, "MODEL_REQUEST_FAILED"],
    ]) {
      status = httpStatus
      payload = { error: { message: "echo fixture-secret" } }
      const result = await probe()
      const text = await result.text()
      assert.equal(result.status, expectedStatus)
      assert.equal(JSON.parse(text).error.code, code)
      assert.ok(!text.includes("fixture-secret"))
    }
    status = 400
    payload = {
      error: { code: "model_not_found", message: "echo fixture-secret" },
    }
    const missingModel = await probe()
    assert.equal(missingModel.status, 422)
    const modelError = await missingModel.text()
    assert.equal(JSON.parse(modelError).error.code, "MODEL_NOT_FOUND")
    assert.ok(!modelError.includes("fixture-secret"))
    status = 200
    payload = { models: [] }
    const invalid = await probe()
    assert.equal((await invalid.json()).error.code, "MODEL_PROTOCOL_ERROR")
    const saved = await (
      await fetch(`${base}/api/model-config`, { headers: { Cookie: cookie } })
    ).json()
    assert.equal(saved.model, "test-model")
  } finally {
    await new Promise((resolve) => upstream.close(resolve))
  }
})

test("configuration key preservation, replacement, and clearing have explicit behavior", async () => {
  const requests = []
  const upstream = http.createServer(async (req, res) => {
    for await (const chunk of req) void chunk
    requests.push(req.headers.authorization)
    res.writeHead(200, { "Content-Type": "application/json" })
    res.end(
      JSON.stringify({
        choices: [{ message: { content: "fixture response" } }],
      })
    )
  })
  await new Promise((resolve) => upstream.listen(0, "127.0.0.1", resolve))
  const baseUrl = `http://127.0.0.1:${upstream.address().port}/v1`
  const headers = { Cookie: cookie, "Content-Type": "application/json" }
  async function save(body) {
    const r = await fetch(`${base}/api/model-config`, {
      method: "PUT",
      headers,
      body: JSON.stringify(body),
    })
    assert.equal(r.status, 200)
    return r.json()
  }
  try {
    await save({ baseUrl, model: "test-model", apiKey: "preserved-secret" })
    await save({ baseUrl, model: "new-model", apiKey: "" })
    await fetch(`${base}/api/model-config/test`, {
      method: "POST",
      headers,
      body: JSON.stringify({ baseUrl, model: "new-model", apiKey: "" }),
    })
    assert.equal(requests.at(-1), "Bearer preserved-secret")
    assert.equal(
      (await save({ baseUrl, model: "new-model", clearApiKey: true }))
        .hasApiKey,
      false
    )
    await fetch(`${base}/api/model-config/test`, {
      method: "POST",
      headers,
      body: JSON.stringify({ baseUrl, model: "new-model" }),
    })
    assert.equal(requests.at(-1), undefined)
  } finally {
    await new Promise((resolve) => upstream.close(resolve))
  }
})

test("configuration and authenticated session remain available after server restart", async () => {
  await stopServer()
  await startServer()
  const session = await fetch(`${base}/api/auth/session`, {
    headers: { Cookie: cookie },
  })
  assert.equal(session.status, 200)
  assert.equal((await session.json()).username, "tester")
  const config = await (
    await fetch(`${base}/api/model-config`, { headers: { Cookie: cookie } })
  ).json()
  assert.equal(config.model, "new-model")
  assert.equal(config.hasApiKey, false)
})

test("unauthenticated writes and cross-origin writes cannot change the saved configuration", async () => {
  const body = JSON.stringify({
    baseUrl: "http://127.0.0.1:9999/v1",
    model: "unauthorized",
  })
  assert.equal(
    (
      await fetch(`${base}/api/model-config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Origin: base },
        body,
      })
    ).status,
    401
  )
  assert.equal(
    (
      await fetch(`${base}/api/model-config/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: base },
        body,
      })
    ).status,
    401
  )
  assert.equal(
    (
      await fetch(`${base}/api/model-config`, {
        method: "PUT",
        headers: {
          Cookie: cookie,
          "Content-Type": "application/json",
          Origin: "https://other.example",
        },
        body,
      })
    ).status,
    403
  )
  assert.equal(
    (
      await (
        await fetch(`${base}/api/model-config`, { headers: { Cookie: cookie } })
      ).json()
    ).model,
    "new-model"
  )
})

test("provider timeout after response headers is reported as a timeout", async () => {
  const upstream = http.createServer((req, res) => {
    req.resume()
    res.writeHead(200, { "Content-Type": "application/json" })
    res.flushHeaders()
    const timer = setTimeout(
      () =>
        res.end(
          JSON.stringify({ choices: [{ message: { content: "late" } }] })
        ),
      20000
    )
    res.on("close", () => clearTimeout(timer))
  })
  await new Promise((resolve) => upstream.listen(0, "127.0.0.1", resolve))
  try {
    const response = await fetch(`${base}/api/model-config/test`, {
      method: "POST",
      headers: { Cookie: cookie, "Content-Type": "application/json" },
      body: JSON.stringify({
        baseUrl: `http://127.0.0.1:${upstream.address().port}/v1`,
        model: "slow-fixture",
      }),
    })
    assert.equal(response.status, 504)
    assert.equal((await response.json()).error.code, "MODEL_TIMEOUT")
  } finally {
    await new Promise((resolve) => upstream.close(resolve))
  }
})
