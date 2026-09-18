// Firebase project: new-hrms-d8eaf — must match android/app/google-services.json
// and server/service-account.json (the backend's FCM sender). These three
// must all reference the SAME Firebase project, otherwise FCM push tokens
// registered by the app belong to a different project than the one the
// backend sends from, and notifications silently fail to deliver.
// If you re-run `flutterfire configure`, let it overwrite this file.
import 'package:firebase_core/firebase_core.dart' show FirebaseOptions;
import 'package:flutter/foundation.dart'
    show defaultTargetPlatform, kIsWeb, TargetPlatform;

class DefaultFirebaseOptions {
  static FirebaseOptions get currentPlatform {
    if (kIsWeb) {
      throw UnsupportedError(
        'Web is not configured for Firebase in this app.',
      );
    }
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return android;
      case TargetPlatform.iOS:
        return ios;
      case TargetPlatform.macOS:
        return ios;
      default:
        throw UnsupportedError(
          'DefaultFirebaseOptions are not supported for this platform.',
        );
    }
  }

  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'AIzaSyCh1bU2TCCbz4hmuSGMTPcvOq81i7lXfQw',
    appId: '1:800902168034:android:a0b7e0c31a6503646f4dbb',
    messagingSenderId: '800902168034',
    projectId: 'new-hrms-d8eaf',
    storageBucket: 'new-hrms-d8eaf.firebasestorage.app',
  );

  static const FirebaseOptions ios = FirebaseOptions(
    apiKey: 'AIzaSyDN2Lwb797W4x3lnDAe9RyIkoQORiE1Hz0',
    appId: '1:800902168034:ios:3c927eb6791911966f4dbb',
    messagingSenderId: '800902168034',
    projectId: 'new-hrms-d8eaf',
    storageBucket: 'new-hrms-d8eaf.firebasestorage.app',
    iosBundleId: 'com.speshway.hrms',
  );
}
