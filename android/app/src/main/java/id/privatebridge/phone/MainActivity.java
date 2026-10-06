package id.privatebridge.phone;
import android.app.*;
import android.content.*;
import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.os.*;
import android.provider.Settings;
import android.widget.*;
import android.view.View;
public class MainActivity extends Activity {
    private final Handler handler=new Handler(); private TextView status; private CheckBox consent;
    private int dp(int n){return (int)(n*getResources().getDisplayMetrics().density+.5f);}
    private final Runnable update=new Runnable(){public void run(){
        String enabled=Settings.Secure.getString(getContentResolver(),Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES);
        boolean permission=enabled!=null&&enabled.toLowerCase(java.util.Locale.ROOT).contains("id.privatebridge.phone/");
        status.setText("KENDALI  ·  "+(BridgeState.active()?"Diizinkan sampai dijeda":"Dijeda")+"\n\nPENGHUBUNG  ·  "+(BridgeService.running?"Aktif di HP":"Belum aktif")+"\n\nACCESSIBILITY  ·  "+(ControlService.instance!=null?"Tersambung":permission?"Izin aktif, layanan terputus":"Izin belum aktif")+"\n\n"+BridgeState.accessibilityEvent);
        handler.postDelayed(this,2000);
    }};
    private GradientDrawable shape(int color){GradientDrawable d=new GradientDrawable();d.setColor(color);d.setCornerRadius(dp(16));return d;}
    private TextView text(String s,int size){TextView t=new TextView(this);t.setText(s);t.setTextSize(size);t.setTextColor(Color.rgb(23,43,56));t.setPadding(0,dp(12),0,dp(12));return t;}
    private void button(LinearLayout parent,String title,boolean primary,Runnable action){Button b=new Button(this);b.setText(title);b.setAllCaps(false);b.setTextColor(primary?Color.WHITE:Color.rgb(0,107,100));b.setBackground(shape(primary?Color.rgb(0,107,100):Color.WHITE));b.setMinHeight(dp(52));LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(-1,-2);lp.setMargins(0,dp(8),0,dp(4));parent.addView(b,lp);b.setOnClickListener(v->action.run());}
    @Override public void onCreate(Bundle state){super.onCreate(state);getWindow().setStatusBarColor(Color.rgb(246,247,242));getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR);
        ScrollView scroll=new ScrollView(this);scroll.setBackgroundColor(Color.rgb(246,247,242));LinearLayout l=new LinearLayout(this);l.setOrientation(1);l.setPadding(dp(24),dp(24),dp(24),dp(36));scroll.addView(l);setContentView(scroll);
        l.addView(text("CHROME MILIKMU",12));l.addView(text("Phone Browser\nBridge",30));l.addView(text("ChatGPT mengendalikan Chrome di HP ini melalui penghubung Cloudflare pribadimu.",16));
        status=text("Memeriksa status…",15);status.setBackground(shape(Color.WHITE));status.setPadding(dp(20),dp(16),dp(20),dp(16));status.setAccessibilityLiveRegion(View.ACCESSIBILITY_LIVE_REGION_POLITE);l.addView(status);
        consent=new CheckBox(this);consent.setText("Aku mengizinkan ChatGPT melihat halaman dan mengendalikan Chrome yang login di HP ini sampai aku menjeda kendali.");consent.setMinHeight(dp(64));consent.setPadding(0,dp(16),0,dp(8));l.addView(consent);
        button(l,"Mulai kendali",true,()->{if(!consent.isChecked()){Toast.makeText(this,"Centang izin pemilik dahulu.",1).show();return;}BridgeState.startSession();startForegroundService(new Intent(this,BridgeService.class));Toast.makeText(this,"Kendali diizinkan. Jalankan agen Termux.",1).show();});
        button(l,"Jeda kendali",false,()->{BridgeState.pause();Toast.makeText(this,"Kendali dijeda.",0).show();});
        l.addView(text("Hubungkan sekali",22));l.addView(text("1. Salin token APK ke setup Termux.\n2. Masukkan token perangkat dari konfigurasi pribadimu.\n3. Pasangkan Wireless Debugging untuk mode DevTools.",16));
        button(l,"Salin token APK",false,()->{((ClipboardManager)getSystemService(CLIPBOARD_SERVICE)).setPrimaryClip(ClipData.newPlainText("Token APK",BridgeState.token(this)));Toast.makeText(this,"Token disalin. Tempel hanya ke setup Termux.",1).show();});
        button(l,"Buka Wireless Debugging",false,()->{try{startActivity(new Intent(Settings.ACTION_APPLICATION_DEVELOPMENT_SETTINGS));}catch(Exception e){startActivity(new Intent(Settings.ACTION_SETTINGS));}});
        l.addView(text("DevTools mengendalikan isi tab Chrome saat aplikasi lain berada di depan. Accessibility hanya diperlukan untuk mode tampilan; Chrome harus terlihat dan HP terbuka.",15));
        l.addView(text("Jaga koneksi HP",22));
        button(l,"Pengaturan Accessibility",false,()->startActivity(new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)));
        button(l,"Pengaturan baterai",false,()->startActivity(new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS)));
        button(l,"Buka Chrome",false,()->{Intent i=getPackageManager().getLaunchIntentForPackage("com.android.chrome");if(i!=null)startActivity(i);else Toast.makeText(this,"Chrome belum terpasang.",1).show();});
        button(l,"Hentikan penghubung lokal",false,()->{BridgeState.pause();stopService(new Intent(this,BridgeService.class));});
        button(l,"Ganti token APK",false,()->new AlertDialog.Builder(this).setTitle("Putuskan pasangan lama?").setMessage("Kendali dijeda. Masukkan token baru ke setup Termux.").setPositiveButton("Ganti",(d,w)->BridgeState.rotateToken(this)).setNegativeButton("Batal",null).show());
        l.addView(text("Tidak ada timer sesi 30 menit. Android tetap dapat menghentikan aplikasi karena baterai, restart, atau tekanan memori. Debugging bukan pengunci izin Accessibility. Password, OTP dan CAPTCHA tetap membutuhkan pemilik bila diminta.",14));
        if(Build.VERSION.SDK_INT>=33&&checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS)!=android.content.pm.PackageManager.PERMISSION_GRANTED)requestPermissions(new String[]{android.Manifest.permission.POST_NOTIFICATIONS},1);
    }
    @Override public void onResume(){super.onResume();handler.post(update);}
    @Override public void onPause(){handler.removeCallbacks(update);super.onPause();}
}
