import * as dotenv from 'dotenv';
import { SoapRequest } from './lib/soap.js';
import chalk from 'chalk';
import { SCHEDULE } from './lib/schedule_class.js';
import { initDb, mongodb } from './lib/db.js';
import crypto from 'crypto';
import * as fs from 'fs';
import ftp  from 'ftp';
dotenv.config();


const location_code = process.env.LOCATION_CODE;
const pos_server = process.env.POS_SERVER; 
const tms_server = process.env.TMS_SERVER;
const add_bookend_schedules = process.env.ADD_BOOKEND_SCHEDULES;
const update_delay = ((process.env.UPDATE_DELAY * 60) * 1000);  // get milliseconds
const bookend_intermission_start = process.env.INTERMISSION_START;
const bookend_shutdown_start = process.env.SHUTDOWN_START;
const bookend_time_length = (process.env.BOOKEND_TIME_LENGTH * 1000) || 60000; // get milliseconds from seconds
const days_to_get_schedule = process.env.SCHEDULE_DAYS;
const pos_filename = process.env.POS_FILENAME;



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
        [ ]0.5 Validate config file (make sure vals are correct datatypes)

        [*]1. Define time loop (based on env.UPDATE_DELAY) 
        
        [*]2. Get sessions via soap from POSitive

        [*]3. Get human friendly session titles from POSitive

        [*]3.25 Add LUXX film type to title
                    --- corrected by adding film title dynamically (from positive data)

        [*]3.5 Get/Set film ID from mongodb database (unique id)

        [*]3.9 Get/set session ID from mongodb (dolby TMS requires int type for id)


        [ ]4. Create xml schedule based on schema of 
              - Dolby LMS
              (*)- Dolby TMS
              - Screenwriter

        [*]5. Generate bookend schedules for LMS and TMS

        [*]6. push file
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
            getSessionsForSchedule(posSchedule)
                .then(updatedSchedule => {
                    // generate schedule file based on system type
                    let schedule = new SCHEDULE();
                    let doremiSchedule = new Uint8Array(Buffer.from(schedule.getDoremiScheduleXML(updatedSchedule)));
                        // save posschedule.xml
                    fs.writeFile('POSSchedule.xml', doremiSchedule, (err) => {
                        if(err){
                            stdOutLogger('Error saving POSSchedule.xml:', 1);
                            console.error(err);
                        }
                        stdOutLogger('POSSchedule.xml saved successfully.');
                        // send schedule to server via ftp
                        let username = 'admin';
                        let password = '1234';
                        let client = new ftp();
                        client.on('ready', () => {
                            client.put('POSSchedule.xml', pos_filename, (err) => {
                                if(err){
                                    stdOutLogger('Unable to send POSSchedule.xml to server'); 
                                    console.log(err);
                                }
                                stdOutLogger('Schedule updated on tms @ ftp://' + tms_server);
                                client.end();
                            });
                        });
                        client.on('error', (err) => {
                            stdOutLogger('There was an error problem with the FTP server:');
                            console.log(err);
                        }) ; 
                        client.connect({ host: tms_server, user: username, password: password });
                    });
                }) 
                .catch(e => {
                    stdOutLogger('Unable to get updated sessions for schedule template', 1);
                    console.log(e)
                });
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
        let current_date = getISOlocaleString();
        let cdIso = (current_date.split('T',1))[0];
        // going to get film sessions up to a year in the future
        let days_to_get_schedule_ms = parseInt(days_to_get_schedule) * 86400000;
        // let year_in_milliseconds = 31556926000;
        let future_date = new Date(days_to_get_schedule_ms + date_time);
        let fdIso = (future_date.toISOString()).substring(0, 10);
        request.getPOSScreeningSessions(location.guid, cdIso, fdIso)
            .then(r => {
                let screening_array = [];

                r.forEach(element => {
                    switch (element.HallName[0]){
                        case "Club 21 Screen 4":
                            element.HallName[0] = "Screen 16";
                            break;
                        case "Club 21 Screen 3":
                            element.HallName[0] = "Screen 15";
                            break;
                        case "Club 21 Screen 2":
                            element.HallName[0] = "Screen 14";
                            break;
                        case "Club 21 Screen 1":
                            element.HallName[0] = "Screen 13";
                    }
                    
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

// handle all database stuff for getting/setting film and session id's that are type INT for legacy dolby and doremi
function getSessionsForSchedule(posSchedule){
    return new Promise(async (resolve, reject) => {
        
        // get & add new films + set film id int
        let films = returnFilms(posSchedule);
        let db = new mongodb();
        let dbFilms;
        try{
            dbFilms = await db.getFilms();
        }
        catch(e){
            stdOutLogger('There was an error getting films from the database:', 1);
            console.log(e);
        }
        let intArray = [];
        dbFilms.forEach(e =>{
            intArray.push(e._id);
        });

        let counter;
        if(Math.max(...intArray) < 1){
            counter = 1; 
        }
        else{
            counter = Math.max(...intArray) + 1;
        }

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

        if(newFilms.length != 0){
            stdOutLogger('New films found. Adding to database...');
            try{
                let status = await db.putFilms(newFilms);
                if(!status){
                    stdOutLogger('Success.');
                }
            }
            catch(e){
                stdOutLogger('There was an error adding films to database: ', 1);
                console.log(e);
            }

        }

        // add bookends if setting is set in config
        // then get/set sessions in sessions db
        if(add_bookend_schedules){
            let bookended_schedule = addBookends(posSchedule);
            try{
                let dbSessions = await db.getSessions();
                if(dbSessions.length != 0){
                    let dbSessionCount = [];
                    dbSessions.forEach(e => {
                        dbSessionCount.push(e.session_id);
                    });

                    let sessionCount = Math.max(...dbSessionCount) + 1;
                    

                    let newSessions = [];
                    for(let i=0; i < bookended_schedule.length; i++){
                        let sessionInDatabase = false;
                        for(let d=0; d < dbSessions.length; d++){
                            if((dbSessions[d]._id === bookended_schedule[i].session_id) || ((dbSessions[d].title === bookended_schedule[i].title) && (dbSessions[d].start === bookended_schedule[i].start))){
                                sessionInDatabase = true;
                            }
                            
                        }
                        
                        if(!sessionInDatabase){
                            let newSession = {
                                session_id: sessionCount,
                                title: bookended_schedule[i].title,
                                movie_id: bookended_schedule[i].movie_id,
                                format: bookended_schedule[i].format,
                                start: bookended_schedule[i].start,
                                end: bookended_schedule[i].end,
                                aud: bookended_schedule[i].aud,
                                date: bookended_schedule[i].date
                            }
                            

                            // this section adds _id to bookend schedules that won't have them
                            if(!bookended_schedule[i].session_id){
                                newSession._id = crypto.randomUUID();
                            }
                            else{
                                newSession._id = bookended_schedule[i].session_id;
                            }
                            
                            newSessions.push(newSession);
                            sessionCount++;
                        }
                    }
                    
                    // push updated sessions to database
                    if(newSessions != 0){
                        try{
                            let response = await db.putSessions(newSessions);
                            if(!response){
                                stdOutLogger('New Sessions added to database.');
                            }
                        }
                        catch(e){
                            stdOutLogger('Error in putSessions', 1);
                            console.log(e);
                        }
                    
                    }

                }
                else{
                    let newSessions = [];
                    for(let i=0; i < bookended_schedule.length; i++){
                        let sid = i + 1;
                        let newSession = {
                            session_id: sid,
                            title: bookended_schedule[i].title,
                            movie_id: bookended_schedule[i].movie_id,
                            format: bookended_schedule[i].format,
                            start: bookended_schedule[i].start,
                            end: bookended_schedule[i].end,
                            aud: bookended_schedule[i].aud,
                            date: bookended_schedule[i].date
                        }

                        // this section adds _id to bookend schedules that won't have them
                        if(!bookended_schedule[i].session_id){
                            newSession._id = crypto.randomUUID();
                        }
                        else{
                            newSession._id = bookended_schedule[i].session_id;
                        }

                        newSessions.push(newSession);
                    }
                    if(newSessions != 0){
                        try{
                            let response = await db.putSessions(newSessions);
                            if(!response){
                                stdOutLogger('New Sessions added to database.');
                            }
                        }
                        catch(e){
                            stdOutLogger('Error in putSessions', 1);
                            console.log(e);
                        }
                    
                    }
                }
            }
            catch(e){
                stdOutLogger('There was an error getting films from database: ', 1);
                console.log(e);
            }

        }
        else{
            try{
                let dbSessions = await db.getSessions();
                if(dbSessions.length != 0){
                    let dbSessionCount = [];
                    dbSessions.forEach(e => {
                        dbSessionCount.push(e.session_id);
                    });

                    let sessionCount = Math.max(...dbSessionCount) + 1;

                    let newSessions = [];
                    for(let i=0; i < posSchedule.length; i++){
                        let sessionInDatabase = false;
                        for(let d=0; i < dbSessions.length; i++){
                            if(dbSessions[d].session_id === posSchedule[i].session_id){
                                sessionInDatabase = true;
                            }
                            
                        }
    
                        if(!sessionInDatabase){
                            let newSession = {
                                _id: posSchedule[i].session_id,
                                session_id: sessionCount,
                                title: posSchedule[i].title,
                                movie_id: posSchedule[i].movie_id,
                                format: posSchedule[i].format,
                                start: posSchedule[i].start,
                                end: posSchedule[i].end,
                                aud: posSchedule[i].aud,
                                date: posSchedule[i].date
                            }
                            
                            // let session_id;
                            // if(!posSchedule[i].session_id){
                            //     newSession.session_id = crypto.randomUUID();
                            // }
                            
                            newSessions.push(newSession);
                            sessionCount++;
                        }
                    }
                    
                    // push updated sessions to database
                    if(newSessions.length != 0){
                        try{
                            let response = await db.putSessions(newSessions);
                            if(!response){
                                stdOutLogger('New Sessions added to database.');
                            }
                        }
                        catch(e){
                            stdOutLogger('Error in putSessions', 1);
                            console.log(e);
                        }
                    
                    }

                }
                else{
                    let newSessions = [];
                    for(let i=0; i < posSchedule.length; i++){
                        let sid = i+1; 
                        let newSession = {
                            _id: posSchedule[i].session_id,
                            session_id: sid,
                            title: posSchedule[i].title,
                            movie_id: posSchedule[i].movie_id,
                            format: posSchedule[i].format,
                            start: posSchedule[i].start,
                            end: posSchedule[i].end,
                            aud: posSchedule[i].aud,
                            date: posSchedule[i].date
                        }
                        newSessions.push(newSession);
                    }
                    if(newSessions.length != 0){
                        try{
                            let response = await db.putSessions(newSessions);
                            if(!response){
                                stdOutLogger('New Sessions added to database.');
                            }
                        }
                        catch(e){
                            stdOutLogger('Error in putSessions', 1);
                            console.log(e);
                        }
                    
                    }

                }
            }
            catch(e){
                stdOutLogger('There was an error getting films from database: ', 1);
                console.log(e);
            }
        }

        // get updated schedule from database and return;
        try{
            let updatedSchedule = await db.getSessions();
            let updatedFilms = await db.getFilms();
            // add film _id int value to return structure
            let newScheduleArray = [];

            for(let i=0; i < updatedSchedule.length; i++){
                for(let f=0; f < updatedFilms.length; f++){
                    if(updatedSchedule[i].movie_id === updatedFilms[f].movie_id){
                        let session = {
                            _id: updatedSchedule[i]._id,
                            session_id: updatedSchedule[i].session_id,
                            title: updatedSchedule[i].title,
                            movie_id: updatedSchedule[i].movie_id,
                            movie_id_int: updatedFilms[f]._id,
                            format: updatedSchedule[i].format,
                            start: updatedSchedule[i].start,
                            end: updatedSchedule[i].end,
                            aud: updatedSchedule[i].aud,
                            date: updatedSchedule[i].date
                        }
                        
                        newScheduleArray.push(session);
                    }
                }
            }

            resolve(newScheduleArray);
        }
        catch(e){
            stdOutLogger('There was an error getting updated sessions from database: ', 1);
            console.log(e);
            reject();
        }
    });

}

function getISOlocaleString(){
    
    let d = new Date();
    let localeString = d.toLocaleString('en-US', {timezone: 'America/Denver'});
    let strArr =  localeString.split('/', 5);
    let year = ((strArr[2]).split(',', 2))[0];
    let month = strArr[0];
    let day = strArr[1];
    let clArr = (localeString.split(' ', 3))[1];
    let hour = (clArr.split(':', 3))[0];
    let minute = (clArr.split(':', 3))[1];
    let second = (clArr.split(':', 3))[2];
    let meridiem = (localeString.split(' ', 3))[2];
    let hourstring;
    // fix hour to be 24
    if((meridiem === 'AM') | (meridiem === 'PM')){
        if((parseInt(hour) <= 12)){
            if(meridiem === 'AM'){
                if(parseInt(hour) === 12){
                    hourstring = "00";
                }
                else if(parseInt(hour) < 10){
                    hourstring = '0' + hour;
                }
                else{
                    hourstring = hour;
                }
            }
            else if(meridiem === 'PM'){
                if(parseInt(hour) === 12){
                    hourstring = hour;
                }
                else if(parseInt(hour) < 10){
                    hourstring = '0' + hour;
                }
            }
            else{
                hourstring = hour;
            }
        }
        else{
            hourstring = hour;
         }
    }
    return year + '-' + month + '-' + day + 'T'  + hourstring + ':' + minute + ':' + second;
}