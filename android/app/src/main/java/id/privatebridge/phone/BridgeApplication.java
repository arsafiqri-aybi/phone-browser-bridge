package id.privatebridge.phone;
public class BridgeApplication extends android.app.Application { @Override public void onCreate(){super.onCreate();BridgeState.init(this);} }
