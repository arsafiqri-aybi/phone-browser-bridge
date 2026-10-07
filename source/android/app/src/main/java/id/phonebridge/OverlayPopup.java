package id.phonebridge;

import android.content.Intent;
import android.provider.Settings;
import android.graphics.PixelFormat;
import android.view.*;
import android.widget.*;

final class OverlayPopup {
    private final BridgeService service;private final WindowManager manager;private LinearLayout view;
    OverlayPopup(BridgeService s){service=s;manager=(WindowManager)s.getSystemService(android.content.Context.WINDOW_SERVICE);}
    void show(){
        if(!Settings.canDrawOverlays(service)||view!=null)return;
        view=new LinearLayout(service);view.setOrientation(1);view.setPadding(18,18,18,18);view.setBackgroundColor(0xffeffaf6);
        WindowManager.LayoutParams p=new WindowManager.LayoutParams(330,WindowManager.LayoutParams.WRAP_CONTENT,WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,PixelFormat.TRANSLUCENT);p.gravity=Gravity.TOP|Gravity.LEFT;p.x=20;p.y=180;
        TextView title=new TextView(service);title.setText("Penghubung Chrome • geser di sini");view.addView(title);
        title.setOnTouchListener(new View.OnTouchListener(){float x,y;int px,py;public boolean onTouch(View v,MotionEvent e){if(e.getAction()==MotionEvent.ACTION_DOWN){x=e.getRawX();y=e.getRawY();px=p.x;py=p.y;return true;}if(e.getAction()==MotionEvent.ACTION_MOVE){p.x=Math.max(0,px+(int)(e.getRawX()-x));p.y=Math.max(0,py+(int)(e.getRawY()-y));manager.updateViewLayout(view,p);return true;}return false;}});
        LinearLayout details=new LinearLayout(service);details.setOrientation(1);view.addView(details);
        Button collapse=new Button(service);collapse.setText("Perkecil / perluas");view.addView(collapse);collapse.setOnClickListener(v->details.setVisibility(details.getVisibility()==View.VISIBLE?View.GONE:View.VISIBLE));
        for(String action:new String[]{"pause","resume","stop"}){Button b=new Button(service);b.setText(action.equals("pause")?"Jeda":action.equals("resume")?"Lanjut":"Stop layanan");details.addView(b);b.setOnClickListener(v->service.startService(new Intent(service,BridgeService.class).setAction(action)));}
        Button pairing=new Button(service);pairing.setText("Status & pairing di aplikasi");details.addView(pairing);pairing.setOnClickListener(v->service.startActivity(new Intent(service,MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)));
        EditText port=new EditText(service);port.setHint("Port pairing");port.setInputType(2);details.addView(port);
        EditText code=new EditText(service);code.setHint("Kode pairing 6 digit");code.setInputType(18);details.addView(code);
        View.OnTouchListener focus=(v,e)->{if(e.getAction()==MotionEvent.ACTION_DOWN){p.flags&=~WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE;manager.updateViewLayout(view,p);}return false;};port.setOnTouchListener(focus);code.setOnTouchListener(focus);
        Button pair=new Button(service);pair.setText("Pairing ponsel ini");details.addView(pair);pair.setOnClickListener(v->{try{int n=Integer.parseInt(port.getText().toString());String value=code.getText().toString();if(n<1||n>65535||!value.matches("[0-9]{6}"))throw new Exception();service.startService(new Intent(service,BridgeService.class).setAction("pair").putExtra("port",n).putExtra("code",value));code.setText("");p.flags|=WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE;manager.updateViewLayout(view,p);}catch(Exception e){Toast.makeText(service,"Periksa port pairing dan kode 6 digit.",Toast.LENGTH_SHORT).show();}});
        Button close=new Button(service);close.setText("Tutup popup (layanan tetap aktif)");view.addView(close);close.setOnClickListener(v->close());
        try{manager.addView(view,p);}catch(Exception e){view=null;}
    }
    void close(){if(view!=null){try{manager.removeView(view);}catch(Exception ignored){}view=null;}}
}
