#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'..');
const [operation='configure',configArg]=process.argv.slice(2);
const target=path.resolve(configArg||path.join(root,'source/cloudflare/installation.local.json'));
const run=args=>{const r=spawnSync(path.join(root,'source/cloudflare/node_modules/.bin/wrangler'),args,{cwd:path.join(root,'source/cloudflare'),stdio:'inherit',env:{...process.env,WRANGLER_SEND_METRICS:'false'}});if(r.status!==0)process.exit(r.status||1);};
if(operation==='configure') {
  const name=process.env.BRIDGE_WORKER_NAME,installation=process.env.BRIDGE_INSTALLATION_ID,account=process.env.CLOUDFLARE_ACCOUNT_ID;
  if(!name||!/^[a-z0-9-]{5,63}$/.test(name)||!installation||!/^[A-Za-z0-9_-]{16,100}$/.test(installation)||!account)throw Error('Set BRIDGE_WORKER_NAME, random BRIDGE_INSTALLATION_ID and CLOUDFLARE_ACCOUNT_ID. Do not put secrets in config.');
  const config=JSON.parse(fs.readFileSync(path.join(root,'source/cloudflare/wrangler.jsonc'),'utf8'));config.name=name;config.account_id=account;config.vars.INSTALLATION_ID=installation;delete config.$schema;
  if(fs.existsSync(target)){if(fs.readFileSync(target,'utf8')!==JSON.stringify(config,null,2)+'\n')throw Error('Existing config differs; preserving it. Choose a separate path.');}
  else fs.writeFileSync(target,JSON.stringify(config,null,2)+'\n',{mode:0o600});
  console.log('Owner installation config prepared. Inspect it before deployment.');
}else{
  const config=JSON.parse(fs.readFileSync(target,'utf8'));
  if(config.name==='phone-browser-bridge-new'||config.vars.INSTALLATION_ID.startsWith('replace-'))throw Error('Configure an owner installation first.');
  if(operation==='check')run(['deploy','--dry-run','--config',target]);
  else if(operation==='deploy'){
    // A new name only: do not overwrite an existing installation automatically.
    const r=spawnSync(path.join(root,'source/cloudflare/node_modules/.bin/wrangler'),['versions','list','--config',target,'--json'],{cwd:path.join(root,'source/cloudflare'),encoding:'utf8',env:process.env});
    if(r.status===0){const versions=JSON.parse(r.stdout);if(versions.length)throw Error('Worker already exists. Use the documented explicit update workflow; bootstrap will not overwrite it.');}
    else if(!/not found|does not exist|10007|10090/i.test(r.stderr+r.stdout))throw Error('Cannot establish resource absence. Check account authorization; no deployment attempted.');
    run(['deploy','--config',target]);
  }else if(operation==='set-password')run(['secret','put','OWNER_PASSWORD','--config',target]);
  else if(operation==='rollback')run(['rollback','--config',target]);
  else throw Error('Use configure, check, deploy, set-password or rollback. No automatic destructive cleanup.');
}
