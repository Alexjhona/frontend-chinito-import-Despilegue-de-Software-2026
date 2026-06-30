import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: Number(__ENV.K6_VUS || 3),
  duration: __ENV.K6_DURATION || '15s',
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<3000'],
  },
};

const targetUrl = __ENV.K6_TARGET_URL || 'http://127.0.0.1:4200';

export default function () {
  const response = http.get(targetUrl);

  check(response, {
    'frontend status is 200': (res) => res.status === 200,
    'frontend returns html': (res) => res.headers['Content-Type']?.includes('text/html'),
  });

  sleep(1);
}
