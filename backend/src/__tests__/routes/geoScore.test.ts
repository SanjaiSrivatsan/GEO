import request from 'supertest';
import app from '../../app';

describe('GEO Score Routes', () => {
  describe('POST /api/geo/score/compute', () => {
    it('should fail without authentication', async () => {
      const response = await request(app)
        .post('/api/geo/score/compute')
        .send({ businessProfileId: 'test-id' });

      expect(response.status).toBe(401);
    });

    it('should fail with missing businessProfileId', async () => {
      const response = await request(app)
        .post('/api/geo/score/compute')
        .set('Authorization', 'Bearer test-token')
        .send({});

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('GET /api/geo/score/:businessProfileId', () => {
    it('should fail without authentication', async () => {
      const response = await request(app).get('/api/geo/score/test-id');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/geo/score/breakdown/:businessProfileId', () => {
    it('should fail without authentication', async () => {
      const response = await request(app).get('/api/geo/score/breakdown/test-id');

      expect(response.status).toBe(401);
    });
  });
});
