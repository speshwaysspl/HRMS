package com.speshway.hrms

import android.app.Activity
import android.content.Intent
import android.content.IntentSender
import com.google.android.gms.common.api.ResolvableApiException
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.LocationSettingsRequest
import com.google.android.gms.location.Priority
import io.flutter.embedding.android.FlutterFragmentActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

// FlutterFragmentActivity (not FlutterActivity) is required by the local_auth
// plugin used for the App Lock feature.
class MainActivity : FlutterFragmentActivity() {
    private val channelName = "com.speshway.hrms/location"
    private val requestCode = 7001
    private var pending: MethodChannel.Result? = null

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, channelName).setMethodCallHandler { call, result ->
            if (call.method == "enableLocation") enableLocation(result) else result.notImplemented()
        }
    }

    /**
     * Shows Google Play services' "Turn on device location" dialog and returns
     * true once location is on. setAlwaysShow(true) makes the dialog appear
     * even if the user previously tapped "No thanks".
     */
    private fun enableLocation(result: MethodChannel.Result) {
        if (pending != null) {
            result.error("BUSY", "A location prompt is already open", null)
            return
        }
        val request = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 10_000L).build()
        val settings = LocationSettingsRequest.Builder()
            .addLocationRequest(request)
            .setAlwaysShow(true)
            .build()
        LocationServices.getSettingsClient(this).checkLocationSettings(settings)
            .addOnSuccessListener { result.success(true) }
            .addOnFailureListener { e ->
                if (e is ResolvableApiException) {
                    try {
                        pending = result
                        e.startResolutionForResult(this, requestCode)
                    } catch (_: IntentSender.SendIntentException) {
                        pending = null
                        result.success(false)
                    }
                } else {
                    // Device can't fix settings via the dialog (no Play services).
                    result.success(false)
                }
            }
    }

    @Deprecated("Uses the classic result callback required by startResolutionForResult")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == this.requestCode) {
            pending?.success(resultCode == Activity.RESULT_OK)
            pending = null
        }
    }
}
