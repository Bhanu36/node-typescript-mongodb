import * as bodyParser from 'body-parser';
import * as compression from 'compression';
import * as cookieParser from 'cookie-parser';
import * as cors from 'cors';
import * as express from 'express';
import * as helmet from 'helmet';
<%_ if(authentication === 'passport-local-strategy') { _%>
import * as passport from 'passport';
import * as session from 'express-session';
import config from '../env/index';
<%_ }_%>
<%_ if(sessionStore === 'mongo') { _%>
import * as mongo from 'connect-mongo';
<%_ }_%>
<%_ if(sessionStore === 'redis') { _%>
import * as redis from 'redis';
import * as connectRedis from 'connect-redis';
<%_ }_%>
import { HttpError } from '../error/index';
import { sendHttpErrorModule } from '../error/sendHttpError';
<%_ if(sessionStore === 'redis') { _%>
const RedisStore: connectRedis.RedisStore = connectRedis(session);

<%_ }_%>
/**
 * @export
 * @param {express.Application} app
 */
export function configure(app: express.Application): void {
    // express middleware
    app.use(bodyParser.urlencoded({
        extended: false
    }));
    app.use(bodyParser.json());
    // parse Cookie header and populate req.cookies with an object keyed by the cookie names.
    app.use(cookieParser());
    // returns the compression middleware
    app.use(compression());
    // helps you secure your Express apps by setting various HTTP headers
    app.use(helmet());
    // providing a Connect/Express middleware that can be used to enable CORS with various options
    app.use(cors());

    <%_ if(authentication === 'passport-local-strategy') { _%>
    /**
     * @swagger
     * components:
     *  securitySchemes:
     *    cookieAuth:
     *      type: apiKey
     *      in: cookie
     *      name: sid
     */
    app.use(session({
        resave: true,
        saveUninitialized: true,
        secret: config.secret,
        name: 'api.sid',
    <%_ if(sessionStore === 'mongo') { _%>
        store: process.env.NODE_ENV === 'development' ? 
        new session.MemoryStore() :
        MongoStore.create({
            mongoUrl: `${config.database.MONGODB_URI}${config.database.MONGODB_DB_MAIN}`,
        })
    <%_ }_%>
    <%_ if(sessionStore === 'redis') { _%>
        store: new RedisStore({ client: redis.createClient({
            port: config.redis.port,
            host: config.redis.host,
            })
        })
    <%_ }_%>
    }));
    app.use(passport.initialize());
    app.use(passport.session());
    <%_ }_%>
    // custom errors
    app.use(sendHttpErrorModule);

    // cors
    app.use((req, res, next) => {
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS ');
        res.header(
            'Access-Control-Allow-Headers',
            'Origin, X-Requested-With,' +
            ' Content-Type, Accept,' +
            ' Authorization,' +
            ' Access-Control-Allow-Credentials'
        );
        res.header('Access-Control-Allow-Credentials', 'true');
        next();
    });
}

interface CustomResponse extends express.Response {
    sendHttpError: (error: HttpError | Error, message ? : string) => void;
}

/**
 * @export
 * @param {express.Application} app
 */
export function initErrorHandler(app: express.Application): void {
    app.use((error: Error, req: express.Request, res: CustomResponse, next: express.NextFunction) => {
        if (typeof error === 'number') {
            error = new HttpError(error); // next(404)
        }

        if (error instanceof HttpError) {
            res.sendHttpError(error);
        } else {
            if (app.get('env') === 'development') {
                error = new HttpError(500, error.message);
                res.sendHttpError(error);
            } else {
                error = new HttpError(500);
                res.sendHttpError(error, error.message);
            }
        }

        console.error(error);
    });
}
