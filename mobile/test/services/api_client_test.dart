import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:speshway/services/api_client.dart';

RequestOptions _req() => RequestOptions(path: '/api/test');

void main() {
  group('extractErrorMessage', () {
    test('reads a backend { error } body', () {
      final e = DioException(
        requestOptions: _req(),
        response: Response(
          requestOptions: _req(),
          statusCode: 400,
          data: {'success': false, 'error': 'Wrong Password'},
        ),
      );
      expect(extractErrorMessage(e), 'Wrong Password');
    });

    test('falls back to a { message } body when no error field', () {
      final e = DioException(
        requestOptions: _req(),
        response: Response(
          requestOptions: _req(),
          statusCode: 500,
          data: {'message': 'Internal failure'},
        ),
      );
      expect(extractErrorMessage(e), 'Internal failure');
    });

    test('reports a friendly message on connection timeout', () {
      final e = DioException(
        requestOptions: _req(),
        type: DioExceptionType.connectionTimeout,
      );
      expect(extractErrorMessage(e), contains('Could not reach the server'));
    });

    test('reports a friendly message on connection error', () {
      final e = DioException(
        requestOptions: _req(),
        type: DioExceptionType.connectionError,
      );
      expect(extractErrorMessage(e), contains('Could not reach the server'));
    });

    test('falls back to a generic message for a non-Dio error', () {
      expect(extractErrorMessage(Exception('boom')), 'Something went wrong. Please try again.');
    });
  });

  group('isNetworkError', () {
    test('true for connection timeout', () {
      final e = DioException(requestOptions: _req(), type: DioExceptionType.connectionTimeout);
      expect(isNetworkError(e), isTrue);
    });

    test('true for connection error (no internet)', () {
      final e = DioException(requestOptions: _req(), type: DioExceptionType.connectionError);
      expect(isNetworkError(e), isTrue);
    });

    test('false for a normal server error response', () {
      final e = DioException(
        requestOptions: _req(),
        type: DioExceptionType.badResponse,
        response: Response(requestOptions: _req(), statusCode: 404, data: {'error': 'Not found'}),
      );
      expect(isNetworkError(e), isFalse);
    });

    test('false for a non-Dio error', () {
      expect(isNetworkError(Exception('boom')), isFalse);
    });
  });
}
