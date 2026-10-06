import readline from 'node:readline';
export function ask(label){return new Promise(resolve=>{const rl=readline.createInterface({input:process.stdin,output:process.stdout});rl.question(label,answer=>{rl.close();resolve(answer.trim());});});}
export function secret(label){
  if(!process.stdin.isTTY)return Promise.reject(new Error('Jalankan setup langsung di terminal interaktif.'));
  return new Promise((resolve,reject)=>{
    let value='';const input=process.stdin;process.stdout.write(label);input.setRawMode(true);input.resume();input.setEncoding('utf8');
    const end=()=>{input.off('data',data);input.setRawMode(false);input.pause();process.stdout.write('\n');};
    const data=chunk=>{for(const char of chunk){if(char==='\u0003'){end();reject(new Error('Dibatalkan.'));return;}if(char==='\r'||char==='\n'){end();resolve(value.trim());return;}if(char==='\u007f'||char==='\b'){value=value.slice(0,-1);}else if(char>=' ')value+=char;}};
    input.on('data',data);
  });
}
