// File generated for the Speshway HRMS Firebase project (speshway-hrms).
// Values mirror android/app/google-services.json and ios/Runner/GoogleService-Info.plist.
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
    apiKey: 'AIzaSyCy7Hgoyk0KSUYZ91tmSkPfSVQI52h571A',
    appId: '1:858623831710:android:113248fe50df1f63ba958f',
    messagingSenderId: '858623831710',
    projectId: 'speshway-hrms',
    storageBucket: 'speshway-hrms.firebasestorage.app',
  );

  static const FirebaseOptions ios = FirebaseOptions(
    apiKey: 'AIzaSyBQH7NW2be7pIf2eWYLYitsNekB_tW0lvk',
    appId: '1:858623831710:ios:5550a4345d3f6054ba958f',
    messagingSenderId: '858623831710',
    projectId: 'speshway-hrms',
    storageBucket: 'speshway-hrms.firebasestorage.app',
    iosBundleId: 'com.speshway.hrms',
  );
}
