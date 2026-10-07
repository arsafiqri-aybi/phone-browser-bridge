package id.phonebridge;

import android.app.Activity;
import android.content.Intent;
import android.os.*;
import android.provider.Settings;
import android.net.Uri;
import android.view.WindowManager;
import android.widget.*;
import okhttp3.*;
import org.json.JSONObject;
import java.net.URI;
import java.util.concurrent.*;

public final class MainActivity extends Activity {
    private LinearLayout layout;private TextView status;private SecureStore store;
    private final ExecutorService work=Executors.newSingleThreadExecutor();private final Handler handler=new Handler(Looper.getMainLooper());
    private final Runnable refresh=new Runnable(){public void run(){BridgeService s=BridgeService.live;status.setText(s==null?"Layanan berhenti. Tap Lanjut untuk memulai.":friendly(s.status()));handler.postDelayed(this,2000);}};
    private EditText input(String hint,boolean secret){EditText e=new EditText(this);e.setHint(hint);if(secret)e.setInputType(129);layout.addView(e);return e;}
    private void button(String label,Runnable r){Button b=new Button(this);b.setText(label);layout.addView(b);b.setOnClickListener(v->r.run());}
    public void onCreate(Bundle b){
        super.onCreate(b);getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);store=new SecureStore(this);
        ScrollView sc=new ScrollView(this);layout=new LinearLayout(this);layout.setPadding(28,28,28,28);layout.setOrientation(1);sc.addView(layout);setContentView(sc);
        TextView title=new TextView(this);title.setText("Penghubung Chrome");title.setTextSize(25);layout.addView(title);
        TextView consent=new TextView(this);consent.setText("APK pengujian 0.1.0 — verifikasi Android 12 fisik masih diperlukan.\n\nWireless Debugging memberi izin ADB yang lebih luas dari browser. Aplikasi ini membatasi operasinya ke Chrome. Profil Chrome dapat berisi akun Anda. Jangan bagikan kode pairing atau token. Jeda menghentikan aksi; Stop menutup layanan; mencabut perangkat di panel memutus akses remote.");layout.addView(consent);
        status=new TextView(this);layout.addView(status);
        EditText endpoint=input("Endpoint HTTPS instalasi Cloudflare Anda",false),enroll=input("Token pendaftaran sekali pakai",true),alias=input("Nama perangkat",false);
        button("Daftarkan perangkat",()->work.execute(()->{
            try{
                String base=endpoint.getText().toString().trim().replaceAll("/+$","");URI uri=new URI(base);
                if(!"https".equals(uri.getScheme())||uri.getHost()==null||uri.getUserInfo()!=null||uri.getQuery()!=null||!uri.getPath().isEmpty())throw new Exception("INVALID_ENDPOINT");
                JSONObject body=new JSONObject().put("enrollmentToken",enroll.getText().toString()).put("alias",alias.getText().toString());
                OkHttpClient client=new OkHttpClient.Builder().callTimeout(15,TimeUnit.SECONDS).build();
                try(Response r=client.newCall(new Request.Builder().url(base+"/api/enroll").post(RequestBody.create(body.toString(),MediaType.get("application/json"))).build()).execute()){
                    if(!r.isSuccessful()||r.body()==null)throw new Exception("ENROLLMENT_FAILED");JSONObject out=new JSONObject(r.body().string());
                    store.put("endpoint",base);store.put("deviceToken",out.getString("deviceToken"));store.put("deviceId",out.getString("deviceId"));store.put("installationId",out.getString("installationId"));
                }
                runOnUiThread(()->{enroll.setText("");Toast.makeText(this,"Perangkat terdaftar. Stop lalu Lanjut jika layanan sudah aktif.",Toast.LENGTH_LONG).show();});
            }catch(Exception e){notice("Pendaftaran gagal. Periksa endpoint dan token baru dari panel.");}
        }));
        button("Buka Wireless Debugging di Setelan",()->startActivity(new Intent(Settings.ACTION_APPLICATION_DEVELOPMENT_SETTINGS)));
        EditText port=input("Port PAIRING dari dialog Android (bukan port koneksi)",false);port.setInputType(2);EditText code=input("Kode pairing 6 digit",true);code.setInputType(18);
        button("Pairing manual dengan ponsel ini",()->{
            try{int p=Integer.parseInt(port.getText().toString());String value=code.getText().toString();if(p<1||p>65535||!value.matches("[0-9]{6}"))throw new Exception();
                startForegroundService(new Intent(this,BridgeService.class).setAction("pair").putExtra("port",p).putExtra("code",value));code.setText("");
            }catch(Exception e){notice("Masukkan port pairing dan kode 6 digit yang ditampilkan Android.");}
        });
        button("Izinkan popup di atas aplikasi lain",()->startActivity(new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,Uri.parse("package:"+getPackageName()))));
        for(String action:new String[]{"resume","pause","stop","popup"})button(action.equals("resume")?"Lanjut / mulai layanan":action.equals("pause")?"Jeda":action.equals("stop")?"Stop layanan":"Tampilkan popup",()->{if(BridgeService.live==null&&!action.equals("resume")){notice("Mulai layanan dahulu.");return;}startForegroundService(new Intent(this,BridgeService.class).setAction(action));});
        button("Lupakan pairing lokal",()->{if(BridgeService.live!=null){notice("Stop layanan sebelum melupakan pairing.");return;}store.remove("adbKey");store.remove("adbCert");store.remove("adbPeerPin");notice("Kunci lokal dihapus. Cabut juga key di Wireless Debugging Android.");});
        button("Buka Chrome",()->{Intent launch=getPackageManager().getLaunchIntentForPackage("com.android.chrome");if(launch!=null)startActivity(launch);else notice("Chrome belum terpasang.");});
        TextView license=new TextView(this);license.setText("Memakai LibADB Android © Muntashir Al-Islam (Apache-2.0), SPAKE2-Java © Muntashir Al-Islam (LGPL-3.0), Conscrypt dan Bouncy Castle. Lisensi, source lengkap, dan instruksi rebuild tersedia dalam ZIP distribusi. Tidak ada klaim sertifikasi atau pengujian fisik yang belum dijalankan.");layout.addView(license);
    }
    private String friendly(JSONObject s){StringBuilder out=new StringBuilder("Kontrol Anda: "+s.optString("ownerIntent")+"\n");for(String k:new String[]{"relay","discovery","adb","chrome"}){JSONObject l=s.optJSONObject(k);out.append(k).append(": ").append(l==null?"belum diketahui":l.optString("state")).append("\n");}return out.toString();}
    private void notice(String text){runOnUiThread(()->Toast.makeText(this,text,Toast.LENGTH_LONG).show());}
    protected void onResume(){super.onResume();handler.post(refresh);}
    protected void onPause(){handler.removeCallbacks(refresh);super.onPause();}
    protected void onDestroy(){handler.removeCallbacks(refresh);work.shutdownNow();super.onDestroy();}
}
