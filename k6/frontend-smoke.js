import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 5,
  duration: '30s',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1000'],
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
