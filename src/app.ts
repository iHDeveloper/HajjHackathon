import * as AuthTokenGenerator from 'jsonwebtoken';
import { isNullOrUndefined } from 'util';
import * as Express from 'express';
const app: Express.Application = require('express')();
import * as mongoose from 'mongoose';
import * as bodyParser from 'body-parser';
import * as SocketIO from 'socket.io';
import * as Http from 'http';
const HttpServer: Http.Server = Http.createServer(app);
const SocketIOServer: SocketIO.Server = SocketIO(HttpServer); 

require("dotenv").config({path: "../"});

app.use(bodyParser.urlencoded({extended:true}));
app.use(bodyParser.json());

const DEFAULT_LANGUAGE = "ar"; 
const SECRET_KEY = "HAJJ_HACKATHON_2018_SECRET_KEY";
const DATABASE_NAME = "hajjhackathon";
const DATABASE_URL = "mongodb://127.0.0.1/" + DATABASE_NAME;

mongoose.connect(DATABASE_URL);
const dbConnection: mongoose.Connection = mongoose.connection;
dbConnection.on('error', console.error.bind(console, 'MongoDB connection error: '));

const DB_Member_Schema = new mongoose.Schema({
    username: { type: String, trim: true, required: true },
    password: { type: String, trim: true, required: true },
    type: { type: Number, trim: true, required: true },
    firstname: { type: String, trim: true, required: true },
    lastname: { type: String, trim: true, required: true },
    nationality: { type: String, trim: true, required: true },
    gender: { type: Boolean, trim: true, required: true },
    phonenumber: { type: String, trim: true, required: true },
}, {
    collection: "Members",
});
const DB_Member = mongoose.model('Member', DB_Member_Schema);

const DB_Group_Schema = new mongoose.Schema({
    id: { type: String, trim: true, required: true },
    name: { type: String, trim: true, required: true },
    leader: { type: Number, trim: true, required: true },
    clients: { type: Map, trim: true, required: true },
}, {
    collection: "Groups",
});
const DB_Group = mongoose.model('Group', DB_Group_Schema);

/**
 * The resposne tools to register a custom layout for the response
 * 
 * @author      iHDeveloper
 */
class ResponseUntil {
    public readonly CODE_OK = 0;
    public readonly CODE_REQUIRE = 1;
    public readonly CODE_METHOD_NOT_FOUND = 2;
    public readonly CODE_METHOD_IS_NOT_EXIST = 3;
    public readonly CODE_NOT_FOUND = 4;
    public readonly CODE_EMPTY = 5;
    public readonly CODE_INVAILD = 6;
    public readonly CODE_PERMISSION_DENIED = 7;
    public readonly CODE_NEED_AUTH = 8;
    public readonly CODE_ERROR = -2;

    public _response(code: number, data: any): string {
        return JSON.stringify({
            code: code,
            data: data
        });
    }

}

/**
 * To know what should call back when some request
 * 
 * @author      iHDeveloper
 */
enum CallbackMethod { 
    AUTH = 0
} 

/**
 * The function that make a custom layout for the request url
 * 
 * @author      iHDeveloper
 */
class Function extends ResponseUntil{
    /**
     * The public name for the function
     */
    public readonly name: string;

    /**
     * The amount of who many requests happend to this function
     */
    private amount: number;
    private needAuth: boolean;

    /**
     * @author      iHDeveloper
     * 
     * @param       name The name of the function request
     */
    constructor(name: string, needAuth?: boolean) {
        super();
        this.name = name;
        this.amount = 0;
        if(!isNullOrUndefined(needAuth)) {
            this.needAuth = needAuth;
        }
    }

    /**
     * Log a message in the google firebase function
     * 
     * @author      iHDeveloper
     * 
     * @param       message The message to log it in the logs of the google firebase
     */
    public log(message: string){
        console.log(`[Function/${this.name}] INFO: ${message}`);
    }

    /**
     * The run to the function method
     * 
     * @author      iHDeveloper
     * 
     * @param       request The request that comes with the function
     * @param       method The method name to know what to do in this function
     * 
     * @return      The response from the function itself 
     */
    public run(req: Express.Request, method: string | undefined): string | CallbackMethod {
        const params: any = req.query; 
        if(method !== undefined) {
            delete params.method;
        } else {
            return this._response(this.CODE_METHOD_NOT_FOUND, {
                message: `The method is not exist in the request`,
            });
        }
        if (this.needAuth) {
            const token: string | undefined = this.auth(req);
            if(token === undefined) {
                return this.on(method, req.query, req.body, undefined);
            } else {
                Screens.auth(token, (screen: Screen | undefined) => {
                    return this.on(method, req.query, req.body, screen);
                });
            }
        } else {
            return this.on(method, req.query, req.body, undefined);
        }
        return this._response(this.CODE_ERROR, {

        });
    }

    /**
     * The handle of this function when it calls in the run method when it's the currect fuction.
     * 
     * @author      iHDeveloper
     * 
     * @param       method The method name to know what do to in this function
     * @param       params The params of the method
     * 
     * @return      The response layout with the data on it
     */
    public on(method: string, params: any, body?: any, authModule?: AuthModule | undefined): string | CallbackMethod{
        return this._response(this.CODE_EMPTY, {});
    }

    /**
     * A function that make sure that all functions have the same system of reuq
     * 
     * @author      iHDeveloper
     * 
     * @param       target The param that you need to do your function using it
     * @param       params The params that your request got them
     * 
     * @return      If string then the function require it if it's undefined then the function
     *              doesn't require it because the function found it in the params.
     */
    public require(target: string, params: any): string | undefined {
        if(params[target] !== undefined) return undefined;
        return this._response(this.CODE_REQUIRE ,{
            data: {
                message: `The request require "${target}"`,
            },
        });
    }

    /**
     * A function that make sure that all functions have the system of require method
     * 
     * @author      iHDeveloper
     * 
     * @return      The response for the method that is not exist
     */
    public requireMethod(): string {
        return this._response(this.CODE_METHOD_IS_NOT_EXIST, {
            message: "The method is not exist to work with it in the function"
        });
    }

    /**
     * To auth the client
     * @param req To read auth header and check from it
     */
    private auth(req: Express.Request): string | undefined {
        if(req.headers && req.headers.authentication && (<string> req.headers.authentication).split(" ")[0] === "JWT") {
            return (<string>req.headers.authentication).split(" ")[1];
        } else {
            return undefined;
        }
    }
}

/**
 * To record all of the language data as possible as we can.
 * 
 * Methods:
 * - store: To store a select event
 * - recommand: To store a recommand event
 * 
 * @author      iHDeveloper
 */
class LanguageFunction extends Function  {
    
    /**
     * Store all of select events
     */
    private selectmap: Map<string, number>;

    /**
     * Store all of the recommands from recomand event
     */
    private recommandmap: Map<string, number>;

    constructor() {
        super("language");
        this.selectmap = new Map<string, number>();
        this.selectmap.set('en', 0);
        this.selectmap.set('ar', 0);
        this.recommandmap = new Map<string, number>();
        this.recommandmap.set('fr', 0);
        this.recommandmap.set('du', 0);
    }

    public on(method: string, params: any): string {
        let section: string;
        if(this.require('section', params) !== undefined) return this.require('section', params);
        section = params.section;
        if(method ===  "store") {
            return this.store(section);
        } else if (method === "recommand") {
            return this.recommand(section);
        } else if (method === "change") {
            // TODO send 
        }
        return this.requireMethod();
    }

    /**
     * Store a use for the language
     * 
     * @author      iHDeveloper
     * 
     * @param       section Section of the lanaguage to control it
     */
    private store(section: string): string{
        if(!this.selectmap.has(section)) {
            return this._response(this.CODE_NOT_FOUND, {
                message: `Section/${section} was not found in the selects`,
            });
        }
        let selects = this.selectmap.get(section);
        if(isNaN(selects)) {
            selects = 0;
        }
        selects++;
        this.selectmap.set(section, selects);
        this.log(`A lanaguage/${section} hit a select and got ${selects} selects`);
        return this._response(this.CODE_OK, {
            message: "Successfully execute the store method",
            count: selects,
        });
    }

    /**
     * Recommand a language to put it in the system
     * 
     * @author      iHDeveloper
     * 
     * @param       section The language name
     */
    private recommand(section: string): string {
        let type = section;
        if(!this.recommandmap.has(type)) {
            type = "other";
        }
        let recommands = this.recommandmap.get(type);
        if(isNaN(recommands)) {
            recommands = 0;
        }
        recommands++;
        this.recommandmap.set(section, recommands);
        this.log(`A lanaguage/${section} hit a recommand and got ${recommands} selects`);
        return this._response(this.CODE_OK, {
            message: "Successfully execute the recommand method",
            count: recommands,
        });
    }
}

/**
 * The location request function to record all the data about location and record them.
 * 
 * Methods:
 * - Active: To store an active event
 * 
 * @author      iHDeveloper
 */
class LocationFunction extends Function {
    private activemap: Map<string, number>;

    constructor() {
        super("location");
        this.activemap = new Map<string, number>();
    }

    public on(method: string, params: any): string{
        let zone: string;
        if(this.require('zone', params) !== undefined) return this.require('zone', params);
        zone = params.zone;
        if(method === "active") {
            return this.active(zone);
        }
        return this.requireMethod();
    }

    private active(zone: string): string{
        if(!this.activemap.has(zone)) {
            return this._response(this.CODE_NOT_FOUND, {
                message: `Zone/${zone} was not found in the system`,
            });
        }
        let actives = isNaN(this.activemap.get(zone)) ? 0 : this.activemap.get(zone);
        actives++;
        this.activemap.set(zone, actives);
        this.log(`A Zone/${zone} hit an active and got ${actives} actives`);
        return this._response(this.CODE_OK, {
            message: `Successfuly execute activity for the zone${zone}`,
        });
    }
}

/**
 * The controller of the function of print to record all of the data that comes from it
 * 
 * They are types of the print function:
 * 1: Paper
 * 2: SMS
 * 3: Save
 * 
 * @author      iHDeveloper
 */
class PrintFunction extends Function {
    public readonly TYPE_SMS = 1;
    public readonly TYPE_PAPER = 2;
    public readonly TYPE_SAVE = 3;
    private viewmap: Map<number, number>;
    private usemap: Map<number, number>;
    private types: Map<number, number>;
     
    constructor() {
        super("print");
        this.viewmap = new Map<number, number>();
        this.usemap = new Map<number, number>();
        this.types = new Map<number, number>();
        this.types.set(this.TYPE_SMS, this.TYPE_SMS);
        this.types.set(this.TYPE_PAPER, this.TYPE_PAPER);
        this.types.set(this.TYPE_SAVE, this.TYPE_SAVE);
    }

    public on(method: string, params: any) {
        let type: number;
        if(this.require('type', params) !== undefined) return this.require('type', params);
        type = parseInt(params.type);
        if (this.types.has(type)) {
            if ( method === "use" ) {
                return this.use(type);
            } else if ( method === "view" ) {
                return this.view(type);
            }
        } else {
            return this._response(this.CODE_NOT_FOUND, {
                message: "Not found the type number",
            });
        }
        return this.requireMethod();
    }

    private view(type: number): string {
        let views: number = isNaN(this.viewmap.get(type)) ? 0 : this.viewmap.get(type);
        views++;
        this.viewmap.set(type, views);
        this.log(`A Type/${type} hit a type and got ${views} views`);
        return this._response(this.CODE_OK ,{
            mesasge: "Successfully execute the view request",
        });
    }

    private use(type: number): string {
        let uses: number = isNaN(this.usemap.get(type)) ? 0 : this.usemap.get(type);
        uses++;
        this.usemap.set(type, uses);
        this.log(`A Type/${type} hit an use and got ${uses} uses`);        
        return this._response(this.CODE_OK ,{
            mesasge: "Successfully execute the use request",
        });
    }

}

/**
 * Handle all of the auth routes and manage it here
 * 
 * @author      iHDeveloper
 */
class AuthFunction extends Function {

    constructor() {
        super("auth", false);
    }

    public on(method: string, params: any, body?: any): string | CallbackMethod {
        if(method === "client") {
            return this.client(body);
        } else if(method === "screen") {
            return this.screen(body);
        }
        return this.requireMethod();
    }


    private client(params: any): string | CallbackMethod {
        console.log("login in");
        let username: string;
        let password: string;
        if(this.require('username', params) !== undefined) return this.require('username', params);
        if(this.require('password', params) !== undefined) return this.require('password', params);
        username = params.username;
        password = params.password;
        const client: Client | undefined = Client.get(username);
        if(client === undefined) {
            return this._response(this.CODE_INVAILD, {
                message: "Invaild username and password",
            });
        }
        const token: string | undefined = client.check(password);
        if ( token === undefined ) {
            return this._response(this.CODE_INVAILD, {
                message: "Invaild username and password",
            });
        }
        return this._response(this.CODE_OK, {
            message: "Successfully logined in!",
            token: token
        });
    }

    private screen(params: any): string | CallbackMethod | undefined {
        if(params !== undefined) {
            let id: string;
            let password: string;
            if(this.require('id', params) !== undefined) return this.require('id', params);
            if(this.require('password', params) !== undefined) return this.require('password', params);
            id = params.id;
            password = params.password;
            const exist: boolean = Screens.exist(id);
            if(!exist) {
                return this._response(this.CODE_INVAILD, {
                    message: "Invaild ID and password",
                });
            }
            const screen: Screen | undefined = Screens.get(id);
            const token: string = screen.check(password);
            return this._response(this.CODE_OK, {
                message: "Successfully verfied that you are one of our screen!",
                token: token,
            });
        }
        return this._response(this.CODE_ERROR, {
            message: "Something wrong was not expacted happend!",
        });
    }
}

/**
 * Check if there's something wrong happen in the zones or somewhere else
 * 
 * @author      iHDeveloper
 */
class AlertFunction extends Function {

    constructor() {
        super("alert", false);
    }

    public on(method: string, params: any): string | undefined {
        let id: string;
        if(this.require('zone', params) !== undefined) return this.require('id', params);
        id = params.zone;
        if(method === "allowed") {
            const random: number = Math.random();
            let allowed: boolean;
            if(random >= 0.5) allowed = true;
            else allowed = false;
            return this._response(this.CODE_OK, {
                id: id,
                allowed: allowed, 
            });
        }
        return this.requireMethod();
    }

}

/**
 * Manage clients and register them
 * 
 * @author      iHDeveloper
 */
class ClientFunction extends Function {

    constructor() {
        super("Client", true);
    }

    public on(method: string, params: any, body: any): string | CallbackMethod {
        if ( method === "create" ) {
            return this.create(body);
        }
        return this.requireMethod();
    }

    private create(params: any): string | CallbackMethod {
        console.log("register!");
        let username: string;
        let password: string;
        let type: number | ClientType;
        let firstname: string;
        let lastname: string;
        let nationality: string;
        let gender: boolean;
        let phonenumber: string;
        if(this.require('username', params) !== undefined) return this.require('username', params);
        if(this.require('password', params) !== undefined) return this.require('password', params);
        if(this.require('type', params) !== undefined) return this.require('type', params);
        if(this.require('firstname', params) !== undefined) return this.require('firstname', params);
        if(this.require('lastname', params) !== undefined) return this.require('lastname', params);
        if(this.require('nationality', params) !== undefined) return this.require('nationality', params);
        if(this.require('gender', params) !== undefined) return this.require('gender', params);
        if(this.require('phonenumber', params) !== undefined) return this.require('phonenumber', params);
        username = params.username;
        password = params.password;
        type = params.type;
        firstname = params.firstname;
        lastname = params.lastname;
        nationality = params.nationality;
        gender = parseInt(params.gender) === 1 ? true : false; 
        phonenumber = params.phonenumber;
        const client: Client = Client.create(username, password, type, firstname, lastname, nationality, gender, phonenumber);
        client.save();
        const token: string = client.check(password);
        return this._response(this.CODE_OK, {
            "message": "Successfully registered",
            "token": token,
        });
    }

}

/**
 * Manage the groups in the hajj and see what they are doing
 * 
 * @author      iHDeveloper
 */
class GroupFunction extends Function {

    constructor() {
        super("Group");
    }

    public on(method: string, params: any, body: any, authModule: AuthModule) {
        if(body !== undefined) {
            if(method === "create") {
                if(authModule === undefined) {
                    return this._response(this.CODE_NEED_AUTH,  {
                        message: "You need to auth yourself for this!",
                    });
                }
                if(authModule instanceof Client) {
                    const leader: Client = <Client> authModule;
                    let id: string;
                    let name: string;
                    if(this.require('id', body) !== undefined) return this.require('id', body);
                    if(this.require('name', body) !== undefined) return this.require('name', body);
                    id = body.id;
                    name = body.name;
                    const group: Group | undefined = Group.create(id, name, leader);
                    if(group === undefined) {
                        return this._response(this.CODE_INVAILD, {
                            message: "Group ID is exist!",
                        });
                    }
                    group.save();
                    return this._response(this.CODE_OK, {
                        id: id,
                        name: name,
                        message: "Successfully created your new group!"
                    });
                } else {
                    return this._response(this.CODE_PERMISSION_DENIED, {
                        message: "Permission denied",
                    });
                }
            }
        }
        return this.requireMethod();
    }

}

/**
 * A group model that explains it and do some stuff on it
 * 
 * @author      iHDeveloper
 */
class Group {
    private static groups: Map<string, Group> = new Map<string, Group>();

    public static create(id: string, name: string, leader: Client): Group | undefined { 
        if(Group.groups.has(id)) {
            return undefined;
        }
        const group: Group = new Group(id, name, leader);
        Group.groups.set(id, group);
        return group;
    }

    private id: string;
    private name: string;
    private leader: Client;
    private clients: Map<string, Client>;

    constructor(id: string, name: string, leader: Client) {
        this.id = id;
        this.name = name;
        this.leader = leader;
        this.clients = new Map<string, Client> ();
    }

    /**
     * Add Clients into the group
     * 
     * @param client Client to add it to the group
     */
    public add(client: Client) {
        this.clients.set(client.id, client);
        client.group = this;
    }

    /**
     * Save all of the clients data in the mongoDB
     * 
     * @author      iHDeveloper
     */
    public save(): void {
        const doc: mongoose.Document = new DB_Group();
        doc.set('id', this.id);
        doc.set('name', this.name);
        doc.set('leader', this.leader.id);
        doc.set('clients', this.clients);
        doc.save();
    }

}

/**
 * Manage the screens and register them
 * 
 * @author      iHDeveloper
 */
class ScreenFunction extends Function {

    constructor() {
        super("Screen", true);
    }

    public on(method: string, params: any, body: any, authModule: AuthModule | undefined): string | CallbackMethod {
        if(body !== undefined) {
            if(method === "create" ) {
                let id: string;
                let password: string;
                if(this.require('id', body) !== undefined) return this.require('id', body);
                if(this.require('password', body) !== undefined) return this.require('password', body);
                id = body.id;
                password = body.password;
                const screen: Screen | undefined = Screens.create(id, password);
                if ( screen === undefined ) {
                    return this._response(this.CODE_INVAILD, {
                        message: "ID is exist!"
                    });
                }
                const token: string = screen.check(password);
                return this._response(this.CODE_OK, {
                    message: "Successfully you loggined in!",
                    token: token,
                });
            }
        }
        return this.requireMethod();
    }

}

/**
 * A module that explains a layout for all of the models that need to auth
 * 
 * @author      iHDeveloper
 */
class AuthModule {
    public readonly id: string;
    protected password: string;
    private authToken: string;

    constructor(id: string, password: string) {
        this.id = id;
        this.password = password;
        this.authToken = AuthTokenGenerator.sign({id: this.id, password: this.password}, SECRET_KEY);
    }

    /**
     *  Check from the password and give a jwt token to the requester
     * 
     * @author      iHDeveloper
     * 
     * @param       password Passwrod to compare between it and the other password
     */
    public check(password: string): string | undefined {
        if(password === this.password) {
            return AuthTokenGenerator.sign({id: this.id, password: this.password}, SECRET_KEY);
        }
        return undefined;
    }

    /**
     * Auth Token to verify it with other client
     * 
     * @param token Auth token of the client
     */
    public auth(token: string): string | undefined {
        if ( this.authToken === token ) {
            return this.authToken;
        }
        return undefined;
    }
}

/**
 * Explains Screen data
 * 
 * @author      iHDeveloper
 */
class Screen extends AuthModule{
    private currentLanguage: string;
    private print: boolean;

    constructor(id: string, password: string) {
        super(id, password);
        this.currentLanguage = DEFAULT_LANGUAGE;
        this.print = false;
    }

    /**
     * Set the current language of the screen to analysis this data later
     * 
     * @author      iHDeveloper
     * 
     * @param currentLanguage Language
     */
    public setCurrentLanguage(currentLanguage: string ) {
        this.currentLanguage = currentLanguage;
    } 

    /**
     * Set if the screen can print a paper or sms or other things
     * 
     * @author      iHDeveloper
     * 
     * @param hasPrint Does screen print ?
     */
    public setHasPrint(hasPrint: boolean ) {
        this.print = hasPrint;
    }

    /**
     * Get the current language of the screen
     * 
     * @author      iHDeveloper
     */
    public getCurrentLanguage(): string {
        return this.currentLanguage;
    }

    /**
     * Does the screen print or no ?
     * 
     * @author      iHDeveloper
     */
    public hasPrint(): boolean {
        return this.print;
    }

}

/**
 * The type of the client in the Hajj
 * 
 * @author      iHDeveloper
 */
enum ClientType {
    MEMBER = 0, // normal member in the group
    LEADER = 1, // leader in the group
    ADMIN = 2   // admin in the group
}

/**
 * Client Data to use it for analysis later
 * 
 * @author      iHDeveloper
 */
class Client extends AuthModule{
    public static readonly map: Map<string, Client> = new Map<string, Client>();

    /**
     * Create the client and import it in the list
     * 
     * @author      iHDeveloper
     * 
     * @param       id Username
     * @param       password Password
     * @param       type Client Type
     * @param       firstname First name
     * @param       lastname Last name
     * @param       nationality Nationality
     * @param       gender Gender
     * @param       phonenumber Phone Number
     */
    public static create(id: string, password: string, type: ClientType, firstname: string, lastname: string, nationality: string, gender: boolean, phonenumber: string): Client {
        const client: Client = new Client(id, password, type, firstname, lastname, nationality, gender, phonenumber);
        Client.map.set(client.id, client);
        return client;
    }

    /**
     * Get the client by ID
     * 
     * @author      iHDeveloper
     * 
     * @param       id Client ID
     * @return      If return undefined means it is not in the map
     */
    public static get(id: string): Client | undefined{
        return this.map.get("username" + id);
    }

    public username: string;
    public firstname: string;
    public lastname: string;
    public nationality: string;
    public languages: string[];
    public phonenumber: string;
    public gender: boolean;
    public type: ClientType;
    public group: Group | undefined;

    constructor(id: string, password: string, type: ClientType, firstname: string, lastname: string, nationality: string, gender: boolean, phonenumber: string) {
        super("username" + id, password);
        this.username = id;
        this.type = type;
        this.firstname = firstname;
        this.lastname = lastname;
        this.nationality = nationality;
        this.gender = gender;
        this.phonenumber = phonenumber;
        this.languages = [];
        this.group = undefined;
    }

    /**
     * Save all of the client data in mongoDB
     * 
     * @author      iHDeveloper
     */
    public save(): void {
        if (this.type === ClientType.MEMBER) {
            const doc: mongoose.Document = new DB_Member();
            doc.set("username", this.username);
            doc.set("password", this.password);
            doc.set("type", this.type);
            doc.set("firstname", this.firstname);
            doc.set("lastname", this.lastname);
            doc.set("nationality", this.nationality);
            doc.set("gender", this.gender);
            doc.set("phonenumebr", this.phonenumber);
            doc.save();
        }
    }
}

/**
 * Manage all the screens
 * 
 * @author      iHDeveloper
 */
class Screens {
    private static screens: Map<string, Screen> = new Map<string, Screen>();

    /**
     * Create screen
     * 
     * @author      iHDeveloper
     * 
     * @param       id Screen ID
     * @param       password Screen Password
     */
    public static create(id: string, password: string): Screen | undefined { 
        const screen: Screen = new Screen(id, password);
        return Screens.add(screen);
    }

    /**
     * Check if the screen is exist or no
     * 
     * @author      iHDeveloper
     * 
     * @param       id Sceren ID
     */
    public static exist(id: string): boolean {
        return Screens.screens.has(id);
    }

    /**
     * Add Screen to cache
     * 
     * @author      iHDeveloper
     * 
     * @param       screen Screen to cache
     */
    public static add(screen: Screen): Screen { 
        this.screens.set(screen.id, screen);
        return screen;
    }

    /**
     * Get the screen if it's available in the map
     * 
     * @author      iHDeveloper 
     * 
     * @param       id Screen ID
     */
    public static get(id: string): Screen | undefined { 
        return this.screens.get(id);
    }

    /**
     * Auth the token verify
     * 
     * @author      iHDeveloper
     * 
     * @param       token Auth Token
     * @param       callback Callback when the token got verify
     */
    public static auth(token: string, callback: (screen: Screen | undefined) => void): void { 
        AuthTokenGenerator.verify(token, SECRET_KEY, (err: AuthTokenGenerator.VerifyErrors, decode: any) => {
            if ( isNullOrUndefined(err) ) {
                callback.call(callback, undefined);
                return;
            }
            callback.call(callback, Screens.get(decode.id));
        });
    }
}

/**
 * Channel listener for the Socket.IO
 * 
 * @author      iHDeveloper
 */
class ChannelListener {
    public readonly name: string;

    constructor(name: string) {
        this.name = name;
    }

}

/**
 * Make a response handler to build the routes of the functions
 * 
 * @author      iHDeveloper
 * 
 * @param       func Function of the route
 * @param       req Client Request
 * @param       resp Client Response
 */
function __resposne(func: Function, req: Express.Request, resp: Express.Response): void {
    const res: string | CallbackMethod = func.run(req, req.params.method);
    if(typeof(res) === typeof(CallbackMethod)) {
        if(res === CallbackMethod.AUTH) {
            resp.send(new ResponseUntil()._response(-1, {
                message: "You need to auth to do this!"
            }));
            return;
        }
    }
    resp.send(res);
    return;
}

/**
 * When the Path got hit with get method
 * 
 * @author      iHDeveloper
 * 
 * @param       path Route Path
 * @param       callback Callback when the path got hit from the client
 */
function __get(path: string, callback: (req: Express.Request, resp: Express.Response) => void) {
    app.get(path, callback);
}

/**
 * When the path got hit with post method
 * 
 * @author      iHDeveloper
 * 
 * @param       path Route Path
 * @param       callback Callback when the path got hit from the client
 */
function __post(path: string, callback: (req: Express.Request, resp: Express.Response) => void) {
    app.post(path, callback);
}

/**
 * Store all of the functions and cache them
 * 
 * @author      iHDeveloper
 */
const functions: Function[] = [
    new LanguageFunction(),
    new LocationFunction(),
    new PrintFunction(),
    new ClientFunction(),
    new AuthFunction(),
    new AlertFunction(),
    new GroupFunction(),
    new ScreenFunction()
];

/**
 * Override all of the route functions
 * 
 * @author      iHDeveloper
 */
for (const func of functions) {
    console.log(`GET | Post => /${func.name}/{method}?{params}`);
    __get(`/${func.name}/:method`, (req: Express.Request, resp: Express.Response) => {
        __resposne(func, req, resp);
    });
    __get(`/${func.name}`, (req: Express.Request, resp: Express.Response) => {
        __resposne(func, req, resp);
    });
    __post(`/${func.name}/:method`, (req: Express.Request, resp: Express.Response) => {
        __resposne(func, req, resp);
    });
    __post(`/${func.name}`, (req: Express.Request, resp: Express.Response) => {
        __resposne(func, req, resp);
    });
}

/**
 * The ping request function for testing the network connection
 * 
 * @author      iHDeveloper
 */
__get('/ping', (req: Express.Request, resp: Express.Response) => {
    console.log(".env: ", JSON.stringify(process.env.public_key));
    resp.send(new ResponseUntil()._response(0, {}));
});

/**
 * When the SocketIO Server hit a connection
 */
SocketIOServer.on('connection', (socket: SocketIO.Socket) => {
    socket.on('question', (data: any) => {
        console.log('Answer: ', data);
    });
    socket.on('help', (data) => {
        socket.emit('help', data);
    });
    socket.on('whereismygroup', (data: any) => {
        socket.emit('whereismygroup', {
            address: "8946 Radwan Baibars, Aziziyah, Jeddah 23342, Saudi Arabia",
            lat: 21.561344,
            lng: 39.206911999999996,            
        });
    });
    socket.emit('alert', 'مرحبا بكم في ناطق | هاكثون الحج');
    socket.on('lang', (data: any) => {
        socket.emit('alert', 'Welcome to Nateq | Hajj Hackathon');
    });
});

/**
 * Make the Http Server listen to port 5000
 */
HttpServer.listen(5000, () => {
    console.log("Running");
});