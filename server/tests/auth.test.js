// server/tests/auth.test.js
// UT-01: JWT authentication middleware
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');

const SECRET = 'unit-test-secret';

function run(authorization) {
    const req = { headers: authorization === undefined ? {} : { authorization } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    auth(req, res, next);
    return { req, res, next };
}

beforeAll(() => { process.env.JWT_SECRET = SECRET; });

describe('JWT authentication middleware', () => {
    test('UT-01 (valid): sets req.user.userId and calls next()', () => {
        const token = jwt.sign({ userId: 'student-42', email: 'a@b.com' }, SECRET, { expiresIn: '1h' });
        const { req, res, next } = run(`Bearer ${token}`);

        expect(next).toHaveBeenCalledTimes(1);
        expect(req.user.userId).toBe('student-42');
        expect(res.status).not.toHaveBeenCalled();
    });

    test('UT-01 (expired): returns 401', () => {
        const token = jwt.sign({ userId: 'student-42' }, SECRET, { expiresIn: -10 });
        const { req, res, next } = run(`Bearer ${token}`);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
        expect(req.user).toBeUndefined();
    });

    test('UT-01 (malformed): returns 401', () => {
        const { req, res, next } = run('Bearer not.a.realtoken');

        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
        expect(req.user).toBeUndefined();
    });

    test('UT-01 (missing): returns 401', () => {
        const { req, res, next } = run(undefined);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
        expect(req.user).toBeUndefined();
    });

    test('UT-01 (extra): a token signed with the wrong secret is rejected', () => {
        const token = jwt.sign({ userId: 'student-42' }, 'some-other-secret');
        const { res, next } = run(`Bearer ${token}`);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });
});
