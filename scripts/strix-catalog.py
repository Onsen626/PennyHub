"""Read the selected Strix source using Python AST; never import or execute it."""
import ast
import json
import sys
from pathlib import Path

root = Path(sys.argv[1])
factory_path = root / "strix/agents/factory.py"
factory = ast.parse(factory_path.read_text())


def module_path(module):
    base = root.joinpath(*module.split("."))
    return base.with_suffix(".py") if base.with_suffix(".py").is_file() else base / "__init__.py"


def definition(module, name, seen=None):
    seen = set() if seen is None else seen
    if (module, name) in seen:
        raise ValueError("Circular tool export")
    seen.add((module, name))
    file = module_path(module)
    tree = ast.parse(file.read_text())
    for node in tree.body:
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node.name == name:
            return file, ast.get_docstring(node) or ""
        if isinstance(node, ast.ImportFrom) and node.module and node.module.startswith("strix."):
            for alias in node.names:
                if (alias.asname or alias.name) == name:
                    return definition(node.module, alias.name, seen)
    raise ValueError(f"Missing native tool definition: {module}.{name}")


imports = {}
for node in factory.body:
    if isinstance(node, ast.ImportFrom) and node.module and node.module.startswith("strix.tools."):
        for alias in node.names:
            imports[alias.asname or alias.name] = (node.module, alias.name)
base_tools = next(node.value for node in factory.body if isinstance(node, ast.AnnAssign) and isinstance(node.target, ast.Name) and node.target.id == "_BASE_TOOLS")
names = [node.id for node in base_tools.elts]
# The factory attaches lifecycle tools and the optional interactive tool separately.
for node in ast.walk(factory):
    if isinstance(node, ast.Name) and node.id in ("finish_scan", "agent_finish", "wait_for_user") and node.id not in names:
        names.append(node.id)
items = []
for name in names:
    module, original = imports[name]
    file, doc = definition(module, original)
    items.append(dict(id=f"function:{name}", kind="tool", name=name, category="native_function", content=doc, source=file.relative_to(root).as_posix(), selectable=False, environment="unverified", evidence="source_definition"))
for capability in ("Shell", "Filesystem"):
    if any(isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and node.func.id == capability for node in ast.walk(factory)):
        items.append(dict(id=f"capability:{capability}", kind="tool", name=capability, category="sdk_capability", content=f"SDK {capability} capability attached by build_strix_agent; tools are bound to a live sandbox per run.", source="strix/agents/factory.py", selectable=False, environment="unverified", evidence="factory_assembly"))
print(json.dumps(items))
