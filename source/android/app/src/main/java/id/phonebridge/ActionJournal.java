package id.phonebridge;

import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.*;
import org.json.JSONObject;

final class ActionJournal extends SQLiteOpenHelper {
    ActionJournal(Context c) { super(c,"actions.db",null,1); getWritableDatabase().execSQL("UPDATE actions SET state='UNKNOWN' WHERE state='DISPATCHED'"); }
    public void onCreate(SQLiteDatabase db) { db.execSQL("CREATE TABLE actions(id TEXT PRIMARY KEY,digest TEXT NOT NULL,state TEXT NOT NULL,result TEXT,created INTEGER NOT NULL)"); }
    public void onUpgrade(SQLiteDatabase db,int old,int next) { throw new IllegalStateException("MIGRATION_REQUIRED"); }
    synchronized JSONObject begin(String id,String digest) throws Exception {
        SQLiteDatabase db=getWritableDatabase();
        try(Cursor c=db.rawQuery("SELECT digest,state,result FROM actions WHERE id=?",new String[]{id})) {
            if(c.moveToFirst()) {
                if(!digest.equals(c.getString(0))) throw new Exception("ACTION_CONFLICT");
                return new JSONObject().put("status",c.getString(1)).put("result",c.isNull(2)?JSONObject.NULL:new JSONObject(c.getString(2)));
            }
        }
        try(Cursor c=db.rawQuery("SELECT count(*) FROM actions",null)) { c.moveToFirst(); if(c.getInt(0)>=10000) throw new Exception("JOURNAL_FULL"); }
        db.execSQL("INSERT INTO actions VALUES(?,?,'DISPATCHED',NULL,?)",new Object[]{id,digest,System.currentTimeMillis()});
        return null;
    }
    synchronized void finish(String id,String status,JSONObject result) {
        getWritableDatabase().execSQL("UPDATE actions SET state=?,result=? WHERE id=?",new Object[]{status,result==null?null:result.toString(),id});
        // Keep permanent action tombstones. Page content is not retained in receipts.
    }
}
