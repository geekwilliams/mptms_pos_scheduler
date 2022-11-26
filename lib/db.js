import { MongoClient } from "mongodb";
import chalk from "chalk";

const uri = "mongodb://localhost:27017/pos-schedule-films/";
const database = 'pos-schedule-films';
const client = MongoClient;

export async function initDb() {
    try {
        let url = uri + database;
        let dbo;

        // connect/create database
        client.connect(uri, { useUnifiedTopology: true }, async function (err, db) {
            if(err){
                console.log('[ ' + chalk.redBright('ERROR') + ' ]' + ' An error occurred connecting to database.')
            }
            else {
                console.log('[ ' + chalk.greenBright('OKAY') + ' ]' + " Database " + database + " initialized.");

                try {
                    // initialize films collection
                    dbo = db.db(database);
                    await dbo.createCollection("films");
                    // add intermission and shutdown shows
                    let films = dbo.collection("films");
                    let bookendShows = [
                        {
                            _id: 1011,
                            title: 'INTERMISSION',
                            movie_id: 'INTERMISSION'
                        },
                        {
                            _id: 1012, 
                            title: 'SHUTDOWN',
                            movie_id: 'SHUTDOWN'
                        }
                    ];

                    await dbo.createCollection("sessions");

                    console.log('[ ' + chalk.greenBright('OKAY') + ' ]' + ' Films and sessions db collections created');

                    let result = await films.insertMany(bookendShows);

                    console.log('[ ' + chalk.greenBright('OKAY') + ' ]' + ' Bookend shows added to database.');

                    

                    await db.close();

                }
                catch (err) {
                    //console.log(err.message);
                    // should output "Collection already exists. NS: film-media.films"

                    if ((err.message === 'Collection already exists. NS: pos-schedule-films.films') |  (err.message === 'Collection already exists. NS: pos-schedule-films.sessions')) {
                        console.log('[ ' + chalk.greenBright('OKAY') + ' ]' + ' Collections have already been initialized.  Continuing....');
                       
                    }
                    else {
                        console.log('[ ' + chalk.redBright('ERROR') + ' ]' + ' There was an error initializing databases:');
                        console.log(err);
                    }
                }
                finally {

                    //close just in case it wasn't closed before
                    await client.close;
                    //console.log("Database connection terminated.");
                }
            }
        });
    }
    catch(err){
        console.log('There was an error initializing database...');
        console.error(err);
    }

}

export class mongodb {
    constructor(){
        this.database = database;
        this.uri = uri;
    }

    getFilms(){
        return new Promise((resolve, reject) => {
            try {
                client.connect(this.uri, {useUnifiedTopology: true }, async function (err, db) {
                    if(err){
                        console.log('[ ' + chalk.redBright('ERROR') + ' ]' + ' An error occurred connecting to database.');
                    }
                    else {
                        try {
                            //setup
                            let dbo = db.db('pos-schedule-films');
                            let films = dbo.collection('films');

                            // fetch
                            let fCursor = films.find();
                            let f = [];
                            await fCursor.forEach(element => {
                                f.push(element);
                            });
                            db.close();
                            resolve(f);
                        }
                        catch (err) {
                            reject({ exit_code: 1, error: err, message: 'An error ocurred retrieving database record(s).'});
                        }
                    }
                    
    
                });
            }
            catch (err) {
                reject({ exit_code: 1, error: err, message: 'An error ocurred connecting to database.'});
            }

        });
    }

    putFilms(f) {
        // takes array of objects
        // let f = { title: 'title', film_id: 'uuid', movie_id: 'movie-uuid' }
        return new Promise((resolve, reject) => {
            try{
                 client.connect(this.uri,  { useUnifiedTopology: true }, async function (err, db) {
                    if(err){
                        console.log(err)
                        console.log('[ ' + chalk.redBright('ERROR') + ' ]' + ' An error occurred connecting to database.');
                    }
                    else {
                        try {


                            //setup
                            let dbo = db.db('pos-schedule-films');
                            let films = dbo.collection('films');
                            
                            await films.insertMany(f, { ordered: true });
                            resolve();
                            // 
            
                        }
                        catch (error) {
                            reject({ exit_code: 1, error: error, message: 'An error ocurred sending database record(s).'});
                        }
                        
                    }
                });
            }
            catch (err){
                
                reject({ exit_code: 1, error: err, message: 'An error ocurred connecting to database.'});
            }
        });
    }


    getSessions(){
        return new Promise((resolve, reject) => {
            try {
                client.connect(this.uri, {useUnifiedTopology: true }, async function (err, db) {
                    if(err){
                        console.log('[ ' + chalk.redBright('ERROR') + ' ]' + ' An error occurred connecting to database.');
                    }
                    else {
                        try {
                            //setup
                            let dbo = db.db('pos-schedule-films');
                            let films = dbo.collection('sessions');

                            // fetch
                            let fCursor = films.find();
                            let f = [];
                            await fCursor.forEach(element => {
                                f.push(element);
                            });
                            db.close();
                            resolve(f);
                        }
                        catch (err) {
                            reject({ exit_code: 1, error: err, message: 'An error ocurred retrieving database record(s).'});
                        }
                    }
                    
    
                });
            }
            catch (err) {
                reject({ exit_code: 1, error: err, message: 'An error ocurred connecting to database.'});
            }

        });
    }

    putSessions(f) {
        // takes array of objects
        // let f = { session_id: 'session ID (int)', session_guid: 'guid', title: 'title', film_id: 'uuid', movie_id: 'movie-uuid' }
        return new Promise((resolve, reject) => {
            try{
                 client.connect(this.uri,  { useUnifiedTopology: true }, async function (err, db) {
                    if(err){
                        console.log(err)
                        console.log('[ ' + chalk.redBright('ERROR') + ' ]' + ' An error occurred connecting to database.');
                    }
                    else {
                        try {


                            //setup
                            let dbo = db.db('pos-schedule-films');
                            let films = dbo.collection('sessions');
                            
                            await films.insertMany(f, { ordered: true });
                            resolve();
                            // 
            
                        }
                        catch (error) {
                            reject({ exit_code: 1, error: error, message: 'An error ocurred sending database record(s).'});
                        }
                        
                    }
                });
            }
            catch (err){
                
                reject({ exit_code: 1, error: err, message: 'An error ocurred connecting to database.'});
            }
        });
    }


}