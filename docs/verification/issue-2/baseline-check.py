#!/usr/bin/env python3
"""Reproduce the original access behavior; apply and roll back the patch in a disposable copy."""
from pathlib import Path
import hashlib,json,os,shutil,signal,socket,subprocess,tempfile,time,urllib.request,urllib.error
root=Path(__file__).resolve().parents[3]
evidence=Path(__file__).resolve().parent
manifest=json.loads((evidence/'manifest.json').read_text())
workspace=Path(tempfile.mkdtemp(prefix='penny-issue2-baseline-'))
server=None
result={}
try:
    for directory in ['app','components','lib','hooks','public','tests','scripts','docs/implementation']:
        source=root/directory
        if source.exists():shutil.copytree(source,workspace/directory)
    for name in ['package.json','package-lock.json','next.config.ts','tsconfig.json','eslint.config.mjs','.gitignore','README.md','postcss.config.mjs','next-env.d.ts']:
        source=root/name
        if source.exists():shutil.copyfile(source,workspace/name)
    (workspace/'node_modules').symlink_to(root/'node_modules',target_is_directory=True)
    rollback=['python3',str(evidence/'rollback.py'),'--root',str(workspace),'--apply']
    restored=subprocess.run(rollback,capture_output=True,text=True,check=True)
    result['rollback']={'command':rollback,'stdout':restored.stdout,'stderr':restored.stderr,'exit_status':restored.returncode}
    listener=socket.socket();listener.bind(('127.0.0.1',0));port=listener.getsockname()[1];listener.close()
    command=['node',str(root/'node_modules/next/dist/bin/next'),'dev','--webpack','--hostname','127.0.0.1','--port',str(port)]
    log=open(workspace/'server.log','w+')
    server=subprocess.Popen(command,cwd=workspace,stdout=log,stderr=log,start_new_session=True,env={**os.environ,'NEXT_TELEMETRY_DISABLED':'1'})
    base=f'http://127.0.0.1:{port}'
    def read(url):
        try:
            with urllib.request.urlopen(url,timeout=60) as response:return response.status
        except urllib.error.HTTPError as error:return error.code
    for attempt in range(120):
        if server.poll() is not None:raise RuntimeError('baseline server exited')
        try:
            home=read(base+'/');break
        except urllib.error.URLError:time.sleep(.25)
    else:raise RuntimeError('baseline startup timeout')
    config=read(base+'/api/model-config')
    assert home==200 and config==404,(home,config)
    result['baseline']={'command':command,'cwd':str(workspace),'inputs':['GET / without cookie','GET /api/model-config without cookie'],'literal_outputs':[f'GET / -> {home}',f'GET /api/model-config -> {config}'],'probe_exit_status':0}
    os.killpg(server.pid,signal.SIGTERM);server.wait(timeout=15);server=None;log.close()
    checked=subprocess.run(['git','apply','--check',str(evidence/'patch.diff')],cwd=workspace,capture_output=True,text=True,check=True)
    applied=subprocess.run(['git','apply',str(evidence/'patch.diff')],cwd=workspace,capture_output=True,text=True,check=True)
    for item in manifest:assert hashlib.sha256((workspace/item['path']).read_bytes()).hexdigest()==item['modified_sha256']
    result['patch']={'command':['git','apply','--check',str(evidence/'patch.diff')],'check_exit_status':checked.returncode,'apply_exit_status':applied.returncode,'stdout':checked.stdout+applied.stdout,'hashes':'all modified hashes match'}
    restored=subprocess.run(rollback,capture_output=True,text=True,check=True)
    result['rollback_after_patch']={'command':rollback,'stdout':restored.stdout,'stderr':restored.stderr,'exit_status':restored.returncode}
    (evidence/'baseline-and-rollback.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
    print(json.dumps(result,ensure_ascii=False,indent=2))
finally:
    if server and server.poll() is None:
        os.killpg(server.pid,signal.SIGTERM);server.wait(timeout=15)
    shutil.rmtree(workspace)
