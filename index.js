import * as dotenv from 'dotenv';
import { SoapRequest } from './lib/soap.js';
import chalk from 'chalk';
import { DolbySchedule } from './lib/dolby_schedule_class.js';
import { DoremiSchedule } from './lib/doremi_schedule_class.js';
import { ScreenwriterSchedule } from './lib/screenwriter_schedule_class.js';
import { initDb, mongodb } from './lib/db.js';
import crypto from 'crypto';
dotenv.config();


const location_code = process.env.LOCATION_CODE;
const pos_server = process.env.POS_SERVER; 
const tms_server = process.env.TMS_SERVER;
const tms_server_type = process.env.TMS_SERVER_TYPE;
const update_delay = ((process.env.UPDATE_DELAY * 60) * 1000);  // get milliseconds
const bookend_intermission_start = process.env.INTERMISSION_START;
const bookend_shutdown_start = process.env.SHUTDOWN_START;
const bookend_time_length = (process.env.BOOKEND_TIME_LENGTH * 1000) || 60000; // get milliseconds from seconds
const days_to_get_schedule = process.env.SCHEDULE_DAYS;



/*
    CINEMA ID's
    Mesa = 60BBA60A-AEE7-477F-B5AA-B2FB9D5450E4
    Studio = 372836B8-F3A5-42CA-BE38-FB5938714C8B
    Capitol = B5796F21-0655-4FE5-AB30-FC3DA48DA896
    SCUW = C73464AC-5B66-4D27-B6A8-56A91A95E1FD
    RS = 71F6B235-3573-4496-B40B-56F47B25081F
    GR = 2D96233F-1B39-4892-8CE0-E5E09E952F19
    America = 9048DD1B-21C6-4069-BABE-19F4FE88FD1F
    Rialto = E264F7F4-99AC-4CFD-802E-0B9144977BC1
*/

// get guid for location

let location;
switch(parseInt(location_code)){ 
    case 10:
        location = {
            name: "America Theater",
            guid: "9048DD1B-21C6-4069-BABE-19F4FE88FD1F"
        }
        break;
    case 11:
        location = {
            name: "Rialto Theater",
            guid: "E264F7F4-99AC-4CFD-802E-0B9144977BC1"
        }
        break;
    case 15:
        location = {
            name: "Studio City", 
            guid: "372836B8-F3A5-42CA-BE38-FB5938714C8B"
        }
        break;
    case 16:
        location = {
            name: "Mesa", 
            guid: "60BBA60A-AEE7-477F-B5AA-B2FB9D5450E4"
        }
        break;
    case 18:
        location = {
            name: "Studio City UW Plaza",
            guid: "C73464AC-5B66-4D27-B6A8-56A91A95E1FD"
        }
        break;
    case 22:
        location = {
            name: "Capitol Theater",
            guid: "B5796F21-0655-4FE5-AB30-FC3DA48DA896"
        }
        break;
    case 31:
        location = {
            name: "Star Stadium Cinema",
            guid: "71F6B235-3573-4496-B40B-56F47B25081F"
        }
        break;
    case 32: 
        location = {
            name: "Star Twin",
            guid: "2D96233F-1B39-4892-8CE0-E5E09E952F19"
        }
        break;
    default:
        location = undefined;
}

if (!location) {
    console.error("Location code is incorrect. Please confirm configuration file.");
    process.exit();
}



/*
    TODO:
        [*]1. Define time loop (based on env.UPDATE_DELAY) 
        
        [*]2. Get sessions via soap from POSitive

        [*]3. Get human friendly session titles from POSitive

        [*]3.25 Add LUXX film type to title
                    --- corrected by adding film title dynamically (from positive data)

        [*]3.5 Get/Set film ID from mongodb database (unique id)

        [ ]3.9 Get/set session ID from mongodb (dolby TMS requires int type for id)


        [ ]4. Create xml schedule based on schema of 
              - Dolby LMS
              - Dolby TMS
              - Screenwriter

        [ ]5. Generate bookend schedules for LMS and TMS

        [ ]6. push file
*/
// get mongodb ready then run main loop
initDb().then(updateSchedule());

// main
function updateSchedule(){
    let date_time = Date.now();
    let current_date_time_iso = new Date();

    getPOSSchedule()
        .then(posSchedule => {
            stdOutLogger('POS Schedule retrieval successfull.');
            // get unique id's for films
            let films = returnFilms(posSchedule);
            let db = new mongodb();
            db.getFilms()
                .then(dbFilms => {
                    // get highest int _id in films array
                    let intArray = [];
                    dbFilms.forEach(e => {     
                        intArray.push(e._id);
                    });
                    let counter = Math.max(...intArray) + 1;

                    //get list of new films (not in database)
                    let newFilms = [];
                    for(let i=0; i < films.length; i++){
                        let filmInDatabase = false;
                        for(let dbFilmIndex=0; dbFilmIndex < dbFilms.length; dbFilmIndex++){
                            if(dbFilms[dbFilmIndex].movie_id === films[i].movie_id){
                                filmInDatabase = true;
                            }
                            
                        }
    
                        if(!filmInDatabase){
                            let newfilm = {
                                _id: counter,
                                title: films[i].title,
                                movie_id: films[i].movie_id
                            }    
                            
                            newFilms.push(newfilm);
                            counter++;
                        }
                    };                  
                    
                    // send new films to database for persistence
                    if(newFilms.length != 0){
                        stdOutLogger('New films found. Adding to database...');
                        db.putFilms(newFilms)
                            .then(response => {
                                stdOutLogger('Success.');
                                switch(tms_server_type.toUpperCase()){
                                    case 'TMS':
                                        let bookended_schedule = addBookends(posSchedule);
                                        stdOutLogger('Checking database sessions...');
                                        // get session id's mapping from db
                                        db.getSessions()
                                            .then(dbSessions => {
                                                if(dbSessions.length === 0){
                                                    let new_schedule = [];
                                                    stdOutLogger('No Sessions in database...');
                                                    for(let i=0; i < bookended_schedule.length; i++){
                                                        let id = i+1
                                                        
                                                        let session = {
                                                            _id: id,
                                                            session_id: bookended_schedule[i].session_id,
                                                            title: bookended_schedule[i].title,
                                                            movie_id: bookended_schedule[i].movie_id,
                                                            format: bookended_schedule[i].format,
                                                            start: bookended_schedule[i].start,
                                                            end: bookended_schedule[i].end,
                                                            aud: bookended_schedule[i].aud,
                                                            date: bookended_schedule[i].date
                                                        }

                                                        let session_id;
                                                        if(!bookended_schedule[i].session_id){
                                                            session.session_id = crypto.randomUUID();
                                                        }
                                                        new_schedule.push(session);
                                                    }

                                                    db.putSessions(new_schedule)
                                                        .then(response => {
                                                            stdOutLogger('New Sessions added to database.');
                                                        })
                                                        .catch(e => {
                                                        
                                                            stdOutLogger('Error in putSessions', 1);
                                                            console.log(e);
                                                        });
                                                }
                                                else{
                                                    // set up to get int id
                                                    let dbSessionInt = [];
                                                    dbSessions.forEach(element => {
                                                        dbSessionInt.push(element.session_id_int);
                                                    })
                                                    let sessionInt = Math.max(...dbSessionInt) + 1;

                                                    // get if sessions are already in database
                                                    let newSessions = [];
                                                    for(let i=0; i < bookended_schedule.length; i++){
                                                        let sessionInDatabase = false;
                                                        for(let d=0; i < dbSessions.length; i++){
                                                            if(dbSessions[d].session_id === bookended_schedule[i].session_id){
                                                                sessionInDatabase = true;
                                                            }
                                                            
                                                        }
                                    
                                                        if(!sessionInDatabase){
                                                            let newSession = {
                                                                _id: bookended_schedule[i]._id,
                                                                session_id: bookended_schedule[i].session_id,
                                                                session_id_int: sessionInt,
                                                                title: bookended_schedule[i].title,
                                                                movie_id: bookended_schedule[i].movie_id,
                                                                format: bookended_schedule[i].format,
                                                                start: bookended_schedule[i].start,
                                                                end: bookended_schedule[i].end,
                                                                aud: bookended_schedule[i].aud,
                                                                date: bookended_schedule[i].date
                                                            }
                                                            
                                                            let session_id;
                                                            if(!bookended_schedule[i].session_id){
                                                                newSession.session_id = crypto.randomUUID();
                                                            }
                                                            
                                                            newSessions.push(newSession);
                                                            sessionInt++;
                                                        }
                                                    }; 

                                                    // push updated sessions to database
                                                    if(newSessions != 0){
                                                        db.putSessions(newSessions)
                                                            .then(response => {
                                                                stdOutLogger('New Sessions added to database.');
                                                            })
                                                            .catch(e => {
                                
                                                                stdOutLogger('Error in putSessions', 1);
                                                                console.log(e);
                                                            });
                                                    }
                                                }
                                            });
                                        break;
                                    case 'LMS': 
                                        break;
                                    case 'SCREENWRITER':
                                        break;
                                    default: 
                                        stdOutLogger('Unable to determine theater management system type.  Please confirm config file', 1);
                                        break;
                                }
                                // do bookends & create xml
                                
                                
                            })
                            .catch(e => {
                                
                                stdOutLogger('Error in putFilms', 1);
                                console.log(e);
                            });
                    }
                    else {
                        switch(tms_server_type.toUpperCase()){
                            case 'TMS':
                                let bookended_schedule = addBookends(posSchedule);
                                stdOutLogger('Checking database sessions...');
                                    // get session id's mapping from db
                                db.getSessions()
                                    .then(dbSessions => {

                                        
                                    //     if(dbSessions.length === 0){
                                    //         let new_schedule = [];
                                    //         stdOutLogger('No Sessions in database...');
                                    //         for(let i=0; i < bookended_schedule.length; i++){
                                    //             let session = {
                                    //                 _id: i + 1,
                                    //                 session_id: bookended_schedule[i].session_id,
                                    //                 film_id_int: bookended_schedule[i]._id,
                                    //                 title: bookended_schedule[i].title,
                                    //                 movie_id: bookended_schedule[i].movie_id,
                                    //                 format: bookended_schedule[i].format,
                                    //                 start: bookended_schedule[i].start,
                                    //                 end: bookended_schedule[i].end,
                                    //                 aud: bookended_schedule[i].aud,
                                    //                 date: bookended_schedule[i].date
                                    //             }
                                    //             new_schedule.push();
                                    //         }
                                    //         db.putSessions(new_schedule);
                                    //     }
                                    //     else{
                                    //         // set up to get int id
                                    //         let dbSessionInt = [];
                                    //         dbSessions.forEach(element => {
                                    //             dbSessionInt.push(element.session_id_int);
                                    //         })
                                    //         let sessionInt = Math.max(...dbSessionInt) + 1;
                                    //         // get if sessions are already in database
                                    //         let newSessions = [];
                                    //         for(let i=0; i < bookended_schedule.length; i++){
                                    //             let sessionInDatabase = false;
                                    //             for(let d=0; i < dbSessions.length; i++){
                                    //                 if(dbSessions[d].session_id === bookended_schedule[i].session_id){
                                    //                     sessionInDatabase = true;
                                    //                 }
                                                    
                                    //             }
                            
                                    //             if(!sessionInDatabase){
                                    //                 let newSession = {
                                    //                     _id: sessionInt,
                                    //                     session_id: bookended_schedule[i].session_id,
                                    //                     title: bookended_schedule[i].title,
                                    //                     movie_id: bookended_schedule[i].movie_id,
                                    //                     format: bookended_schedule[i].format,
                                    //                     start: bookended_schedule[i].start,
                                    //                     end: bookended_schedule[i].end,
                                    //                     aud: bookended_schedule[i].aud,
                                    //                     date: bookended_schedule[i].date
                                    //                 }    
                                                    
                                    //                 newSessions.push(newSession);
                                    //                 sessionInt++;
                                    //             }
                                    //         }; 
                                    //         // push updated sessions to database
                                    //         if(newSessions != 0){
                                    //             db.putSessions(newSessions)
                                    //                 .then(response => {
                                    //                 })
                                    //                 .catch(e => {
                        
                                    //                     stdOutLogger('Error in putSessions', 1);
                                    //                     console.log(e);
                                    //                 });
                                    //         }
                                    //     }
                                    });
                                break;
                            case 'LMS': 
                                break;
                            case 'SCREENWRITER':
                                break;
                            default: 
                                stdOutLogger('Unable to determine theater management system type.  Please confirm config file', 1);
                                break;
                        }
                        // do bookends & create xml

                    }
                    
                    
                })
                .catch(e => {
                    console.log(e)
                    stdOutLogger(e, 1);
                });
            // generate class based on location
            let serverSchedule;
            switch(tms_server_type.toUpperCase()){
                case 'TMS':
                    serverSchedule = new DoremiSchedule();
                    break;
                case 'LMS':
                    serverSchedule = new DolbySchedule();
                    break;
                case 'Screenwriter':
                    serverSchedule = new ScreenwriterSchedule();
                    break;
                default:
                    stdOutLogger('Unable to determine Theater Management System Type.  Please confirm "TMS_SERVER_TYPE" is correct in config.', 1);
            }
            

        })
        .catch(e => {
            stdOutLogger('There was a problem getting POS Schedules', 1);
            console.log(e)
        });


    setTimeout(updateSchedule, update_delay);
}

// format stdout
function stdOutLogger(output, status) {
    let m = new Date();
    let dateString =
    m.getUTCFullYear() + "/" +
    ("0" + (m.getUTCMonth()+1)).slice(-2) + "/" +
    ("0" + m.getUTCDate()).slice(-2) + " " +
    ("0" + m.getUTCHours()).slice(-2) + ":" +
    ("0" + m.getUTCMinutes()).slice(-2) + ":" +
    ("0" + m.getUTCSeconds()).slice(-2);
    let message = "[ " + dateString + " ]   ";
    if(status){
        message += chalk.redBright(output);
    }   
    else{
        message += output;
    }
    
    console.log(message);
}

// get schedule from POSitive
function getPOSSchedule(){
    return new Promise((resolve, reject) => {
        let request = new SoapRequest(pos_server);

        let date_time = Date.now();
        let current_date_time_iso = new Date();

        // going to get film sessions up to a year in the future
        let days_to_get_schedule_ms = parseInt(days_to_get_schedule) * 86400000;
        // let year_in_milliseconds = 31556926000;
        let future_date_iso = new Date(days_to_get_schedule_ms + date_time);

        request.getPOSScreeningSessions(location.guid, current_date_time_iso, future_date_iso)
            .then(r => {
                let screening_array = [];

                r.forEach(element => {

                    let film_title = element.SeanceName[0];
                    screening_array.push({
                        title: film_title,
                        session_id: element.SeanceId[0],
                        format: element.SeanceCopyTypeDescription[0],
                        start: element.SeanceTimeFrom[0],
                        end: element.SeanceTimeTo[0],
                        date: element.SeanceDay[0],
                        aud: element.HallName[0],
                        movie_id: element.MovieCopyId[0]
                    });                    
                });

                let auditoriums = [];
                screening_array.forEach(element => {
                    if(!auditoriums.includes(element.aud)){
                        auditoriums.push(element.aud);
                    }
                });
                
                //let screening_by_auditorium = {};
                
                // for (let house in auditoriums){
                //     screening_by_auditorium[auditoriums[house]] = []
                //     screening_array.forEach(element =>{ 
                //         if(element.aud == auditoriums[house]){
                //             let session = {
                //                 title: element.title,
                //                 film_id: element.id,
                //                 format: element.format,
                //                 start: element.start,
                //                 end: element.end,
                //                 movie_id: element.movie_id
                //             }
                            
                           
                //            screening_by_auditorium[auditoriums[house]].push(session);
                //         }
                //     });
                // }   
                
                //let bookended_schedule = addBookends(screening_by_auditorium);

                resolve(screening_array);
            })
            .catch(e => reject(e));
    })
}

function returnFilms(scheduleArray){
    let films = [];
    scheduleArray.forEach(element => {
        if (!(films.find(e => e.title === element.title))){
            let o = {
                title: element.title,
                movie_id: element.movie_id
            }
            films.push(o);
        }
    });
    return films;
}

// Add bookend schedules
function addBookends(schedule){
    let dates = [];  
    let auditoriums = [];
    let screening_by_auditorium = [];
    

    for(let i=0; i < schedule.length; i++){
        if(!auditoriums.find(e => e === schedule[i].aud)){
            auditoriums.push(schedule[i].aud);
        }

        if(!dates.find(e => e === schedule[i].date)){
            dates.push(schedule[i].date);
        }
    }
    // organizing screenings by auditoriums
    auditoriums.forEach(element => {
        screening_by_auditorium[element] = [];
        for(let i=0; i < schedule.length; i++){
            if(schedule[i].aud === element){
                screening_by_auditorium[element].push(schedule[i]);

            }
        }
    });
    // sort sessions by start time
    for(let screen in screening_by_auditorium){
        screening_by_auditorium[screen].sort((a, b) => {
            let one = Date.parse(a.start);
            let two = Date.parse(b.start);
    
            if(one > two){ 
                return 1;
            }
            else if(two > one){
                return -1;
            }
            else{
                return 0;
            }
        });
    }
    
    // add bookends
    for(let screen in screening_by_auditorium){
        let c = 0; 
        let bookend_arr = [];
        for(let d=0; d < dates.length; d++){
            
            // create array based on showtime for each date
            let show_date_arr = [];
            
            
            for(let i=0; i < screening_by_auditorium[screen].length; i++){
                if((screening_by_auditorium[screen][i].date) === dates[d]){
                    show_date_arr.push(screening_by_auditorium[screen][i]);
                }
            }
            
            // sort show_date_arr
            show_date_arr.sort((a, b) => {
                let one = Date.parse(a.start);
                let two = Date.parse(b.start);
    
                if(one > two){ 
                    return -1;
                }
                else if(two > one){
                    return 1;
                }
                else{
                    return 0;
                }
            });
            if(show_date_arr.length != 0){
                let intermission_start = (new Date(Date.parse(show_date_arr[show_date_arr.length - 1].start +'Z') - (bookend_intermission_start * 60000)).toISOString()).substring(0, 19);
                let intermission_end = (new Date(Date.parse(intermission_start + 'Z') + bookend_time_length).toISOString()).substring(0, 19);
                let shutdown_start = (new Date(Date.parse(show_date_arr[0].end + 'Z') + (bookend_shutdown_start * bookend_time_length)).toISOString()).substring(0, 19);
                let shutdown_end = (new Date(Date.parse(shutdown_start + 'Z') + 60000).toISOString()).substring(0, 19);
                
                // DONT FREAKING USE CONST FOR STUFF THAT CHANGES DUMMY
                let int_show = {
                    _id: '1011', 
                    title: 'INTERMISSION',
                    movie_id: 'INTERMISSION',
                    format: '2D',
                    start: '',
                    end: '',
                    aud: ''
                }
                int_show.aud = screen;
                int_show.start = intermission_start;
                int_show.end = intermission_end;
                int_show.date = intermission_start.substring(0, 10);

                let shut_show = {
                    _id: '1012',
                    title: 'SHUTDOWN',
                    movie_id: 'SHUTDOWN',
                    format: '2D',
                    start: '',
                    end: '',
                    aud: ''
                }
                shut_show.aud = screen;
                shut_show.start = shutdown_start;
                shut_show.end = shutdown_end;
                shut_show.date = shutdown_start.substring(0, 10);



                bookend_arr.push(int_show, shut_show);
            }
        
        }

        bookend_arr.forEach(element => {
            schedule.push(element);
        });

    }

    return schedule;
}
