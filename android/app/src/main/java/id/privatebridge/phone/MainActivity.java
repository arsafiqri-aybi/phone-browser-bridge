package id.privatebridge.phone;
import android.app.*;
import android.content.*;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.*;
import android.provider.Settings;
import android.widget.*;
import android.view.View;
public class MainActivity extends Activity {
    private final Handler handler=new Handler(Looper.getMainLooper());
    private TextView headline,note,apkState,agentState,relayState,chromeState,batteryState; private CheckBox consent;private Button start,pause;
    private static final int INK=Color.rgb(17,36,52),MUTED=Color.rgb(90,106,115),PAPER=Color.rgb(246,248,247),GREEN=Color.rgb(0,104,84);
    private int dp(int n){return (int)(n*getResources().getDisplayMetrics().density+.5f);}
    private GradientDrawable shape(int color,int radius){GradientDrawable d=new GradientDrawable();d.setColor(color);d.setCornerRadius(dp(radius));return d;}
    private TextView text(String s,int size,int color,boolean bold){TextView t=new TextView(this);t.setText(s);t.setTextSize(size);t.setTextColor(color);t.setLineSpacing(dp(3),1);if(bold)t.setTypeface(Typeface.create("sans-serif",Typeface.BOLD));return t;}
    private void space(LinearLayout p,int n){View v=new View(this);p.addView(v,new LinearLayout.LayoutParams(1,dp(n)));}
    private LinearLayout section(LinearLayout p){LinearLayout l=new LinearLayout(this);l.setOrientation(1);l.setPadding(dp(20),dp(20),dp(20),dp(20));l.setBackground(shape(Color.WHITE,20));LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(-1,-2);lp.setMargins(0,dp(16),0,0);p.addView(l,lp);return l;}
    private TextView row(LinearLayout p,String name){LinearLayout l=new LinearLayout(this);l.setGravity(android.view.Gravity.CENTER_VERTICAL);TextView label=text(name,14,MUTED,false),value=text("Memeriksa…",14,INK,true);value.setGravity(android.view.Gravity.END);l.addView(label,new LinearLayout.LayoutParams(0,dp(48),1));l.addView(value,new LinearLayout.LayoutParams(0,-2,1.4f));p.addView(l);return value;}
    private Button button(LinearLayout parent,String title,boolean primary,Runnable action){Button b=new Button(this);b.setText(title);b.setTextSize(15);b.setAllCaps(false);b.setTextColor(primary?Color.WHITE:INK);b.setBackground(shape(primary?GREEN:PAPER,12));b.setMinHeight(dp(52));LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(-1,-2);lp.setMargins(0,dp(10),0,0);parent.addView(b,lp);b.setOnClickListener(v->action.run());return b;}
    private void toast(String s){Toast.makeText(this,s,Toast.LENGTH_SHORT).show();}
    private boolean fresh(){return BridgeState.agentSeen>0 && SystemClock.elapsedRealtime()-BridgeState.agentSeen<45000;}
    private final Runnable update=new Runnable(){public void run(){
        boolean active=BridgeState.active(),fresh=fresh();
        headline.setText(active?(fresh&&BridgeState.relayConnected&&BridgeState.chromeConnected?"Chrome terhubung.":"Kendali aktif."):"Kamu yang memegang kendali.");
        note.setText(active?"Izin tetap aktif sampai kamu menekan Jeda. Koneksi dipulihkan saat penghubung tersedia.":"Hubungkan Chrome di HP ini ke ChatGPT. Mulai ketika kamu siap.");
        apkState.setText(BridgeService.running?"Aktif di perangkat":"Belum aktif");agentState.setText(fresh?"Terhubung":"Menunggu Termux");relayState.setText(fresh&&BridgeState.relayConnected?"Terhubung":"Belum terverifikasi");chromeState.setText(fresh&&BridgeState.chromeConnected?"DevTools tersedia":ControlService.instance!=null?"Accessibility tersedia":"Menunggu Chrome");
        PowerManager power=(PowerManager)getSystemService(POWER_SERVICE);batteryState.setText(power.isIgnoringBatteryOptimizations(getPackageName())?"Tanpa pembatasan":"Periksa pengaturan");
        start.setText(active?"Kendali sudah aktif":"Mulai kendali");pause.setEnabled(active);pause.setAlpha(active?1f:.5f);
        handler.postDelayed(this,2000);
    }};
    @Override public void onCreate(Bundle state){super.onCreate(state);getWindow().setStatusBarColor(PAPER);getWindow().setNavigationBarColor(PAPER);getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR);
        ScrollView scroll=new ScrollView(this);scroll.setFillViewport(true);scroll.setBackgroundColor(PAPER);LinearLayout root=new LinearLayout(this);root.setOrientation(1);root.setPadding(dp(20),dp(22),dp(20),dp(32));scroll.addView(root);setContentView(scroll);
        root.addView(text("CHROME BRIDGE",14,INK,true));space(root,20);
        LinearLayout hero=new LinearLayout(this);hero.setOrientation(1);hero.setPadding(dp(24),dp(26),dp(24),dp(26));hero.setBackground(shape(INK,24));root.addView(hero);
        hero.addView(text("PERANGKATMU · KENDALIMU",11,Color.rgb(151,203,187),true));space(hero,14);headline=text("Kamu yang memegang kendali.",29,Color.WHITE,true);hero.addView(headline);space(hero,12);note=text("",15,Color.rgb(208,222,228),false);hero.addView(note);space(hero,22);hero.addView(text("Tanpa batas waktu sesi",13,Color.rgb(173,229,207),true));
        LinearLayout controls=section(root);controls.addView(text("Kendali browser",20,INK,true));space(controls,6);controls.addView(text("ChatGPT dapat membaca dan mengoperasikan halaman Chrome yang login di HP ini sesuai perintahmu.",14,MUTED,false));
        consent=new CheckBox(this);consent.setText("Aku mengizinkan kendali sampai aku menjedanya.");consent.setTextSize(14);consent.setTextColor(INK);consent.setChecked(BridgeState.active());consent.setPadding(0,dp(12),0,0);controls.addView(consent);
        start=button(controls,"Mulai kendali",true,()->{if(!consent.isChecked()){toast("Centang izin pemilik dahulu.");return;}BridgeState.startSession();startForegroundService(new Intent(this,BridgeService.class));toast("Kendali aktif. Pastikan layanan Termux berjalan.");});
        pause=button(controls,"Jeda kendali",false,()->{BridgeState.pause();toast("Kendali dijeda.");});
        LinearLayout connection=section(root);connection.addView(text("Koneksi perangkat",20,INK,true));space(connection,8);apkState=row(connection,"Penghubung APK");agentState=row(connection,"Agen Termux");relayState=row(connection,"Relay");chromeState=row(connection,"Jalur Chrome");batteryState=row(connection,"Baterai APK");space(connection,8);connection.addView(text("Status koneksi diperiksa berkala. HP terkunci perlu dibuka sendiri sebelum perintah dijalankan.",13,MUTED,false));
        LinearLayout setup=section(root);setup.addView(text("Siapkan sekali. Pakai kapan saja.",20,INK,true));space(setup,8);setup.addView(text("Pasangkan perangkat, nyalakan layanan Termux, lalu hubungkan ChatGPT.",14,MUTED,false));
        button(setup,"Panduan koneksi & Termux",true,()->startActivity(new Intent(Intent.ACTION_VIEW,Uri.parse("https://phone-chrome-mcp.arsafiqri-ua03.workers.dev/guide"))));
        button(setup,"Salin token APK",false,()->{((ClipboardManager)getSystemService(CLIPBOARD_SERVICE)).setPrimaryClip(ClipData.newPlainText("Token APK",BridgeState.token(this)));toast("Tempel token hanya ke setup Termux.");});
        button(setup,"Pengaturan baterai",false,()->startActivity(new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS)));
        button(setup,"Buka Chrome",false,()->{Intent i=getPackageManager().getLaunchIntentForPackage("com.android.chrome");if(i!=null)startActivity(i);else toast("Chrome belum terpasang.");});
        button(setup,"Pengaturan lainnya",false,()->new AlertDialog.Builder(this).setTitle("Pengaturan perangkat").setItems(new String[]{"Wireless Debugging","Accessibility","Buka panel koneksi","Hentikan penghubung lokal","Ganti token APK"},(dialog,which)->{
          if(which==0){try{startActivity(new Intent(Settings.ACTION_APPLICATION_DEVELOPMENT_SETTINGS));}catch(Exception e){startActivity(new Intent(Settings.ACTION_SETTINGS));}}
          if(which==1)startActivity(new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS));
          if(which==2)startActivity(new Intent(Intent.ACTION_VIEW,Uri.parse("https://phone-chrome-mcp.arsafiqri-ua03.workers.dev/admin")));
          if(which==3){BridgeState.pause();stopService(new Intent(this,BridgeService.class));toast("Penghubung lokal dihentikan. Hentikan juga layanan Termux.");}
          if(which==4)new AlertDialog.Builder(this).setTitle("Ganti pasangan APK?").setMessage("Kendali dijeda. Masukkan token baru ke setup Termux.").setPositiveButton("Ganti",(d,w)->BridgeState.rotateToken(this)).setNegativeButton("Batal",null).show();
        }).show());
        space(root,20);root.addView(text("Chrome berjalan di HP kamu. Mode aktif memakai daya tambahan. Android dan jaringan tetap menentukan ketersediaan perangkat.",12,MUTED,false));space(root,8);root.addView(text("Chrome Bridge 2.1",12,MUTED,true));
        if(Build.VERSION.SDK_INT>=33&&checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS)!=android.content.pm.PackageManager.PERMISSION_GRANTED)requestPermissions(new String[]{android.Manifest.permission.POST_NOTIFICATIONS},1);
    }
    @Override public void onResume(){super.onResume();if(BridgeState.active())startForegroundService(new Intent(this,BridgeService.class));handler.removeCallbacks(update);handler.post(update);}
    @Override public void onPause(){handler.removeCallbacks(update);super.onPause();}
}
