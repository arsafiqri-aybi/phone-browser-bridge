import fs from 'node:fs/promises';
import {validSerial,AndroidLink} from '../src/android-link.js';
import {ask} from './input.js';
const serial=process.argv[2]||(await ask('IP:port koneksi di halaman utama Wireless Debugging: ')).trim();
if(!validSerial(serial))throw Error('Gunakan IP:port koneksi, bukan port pairing.');
const env=await fs.readFile('.env','utf8');await fs.writeFile('.env',env.replace(/^ADB_SERIAL=.*\n?/gm,'').trimEnd()+'\nADB_SERIAL='+serial+'\n',{mode:0o600});await fs.chmod('.env',0o600);
const result=await new AndroidLink({serial}).ensure();console.log(result.devtools_available?'Chrome tersambung. Pemulihan ADB aktif.':'Alamat disimpan. Aktifkan Wireless Debugging dan buka Chrome; agen akan mencoba lagi.');
