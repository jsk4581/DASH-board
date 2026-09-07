package com.kioapps.dash;

import android.content.Intent;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Receives text another app shared to DASH (ACTION_SEND text/plain) and hands
 * it to the web layer: getPending() returns what the launching intent carried,
 * and a "share" event fires when a new intent arrives while running.
 */
@CapacitorPlugin(name = "ShareTarget")
public class ShareTargetPlugin extends Plugin {
    private JSObject pending;

    @Override
    public void load() {
        pending = extract(getActivity().getIntent());
    }

    @PluginMethod
    public void getPending(PluginCall call) {
        JSObject data = pending != null ? pending : new JSObject();
        pending = null;
        call.resolve(data);
    }

    @Override
    protected void handleOnNewIntent(Intent intent) {
        super.handleOnNewIntent(intent);
        JSObject data = extract(intent);
        if (data != null) notifyListeners("share", data, true);
    }

    private static JSObject extract(Intent intent) {
        if (intent == null || !Intent.ACTION_SEND.equals(intent.getAction())) return null;
        String text = intent.getStringExtra(Intent.EXTRA_TEXT);
        String subject = intent.getStringExtra(Intent.EXTRA_SUBJECT);
        if (text == null && subject == null) return null;
        // consume it: a config change or relaunch must not share it again
        intent.setAction(Intent.ACTION_MAIN);
        JSObject data = new JSObject();
        data.put("title", subject != null ? subject : "");
        data.put("text", text != null ? text : "");
        data.put("url", "");
        return data;
    }
}
