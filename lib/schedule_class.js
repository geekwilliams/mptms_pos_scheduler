export class SCHEDULE{
    constructor(){}

    getDoremiScheduleXML(sessions){
        let sessionsXML = '';
        const xmlHeader = `<?xml version = "1.0" encoding = "UTF-8"?>` + '\n';
        const xmlScheduleOpen = `<schedule>` + '\n';
        const xmlScheduleClose = `</schedule>` + '\n';
        const creator = `    <creator>mptms_pos_scheduler v0.5</creator>` + '\n';
        const performanceTableOpen = `    <table name="performance">` + '\n';
        const featureTableOpen = `    <table name="feature">` + '\n';
        const tableClose = `    </table>`;
        const rowOpen = `        <row>` +' \n';
        const rowClose = `        </row>` + '\n';

        sessionsXML += xmlHeader;
        sessionsXML += xmlScheduleOpen;
        sessionsXML += creator;
        sessionsXML += performanceTableOpen;
        
        // add sessions
        for(let s=0; s < sessions.length; s++){
            sessionsXML += rowOpen;
            sessionsXML += generateDoremiPerformanceColumn(sessions[s]);
            sessionsXML += rowClose;
        }
        sessionsXML += tableClose + "\n";
        sessionsXML += featureTableOpen;

        let uniqueFilms = returnFilms(sessions);

        for(let f=0; f < uniqueFilms.length; f++){
            sessionsXML += rowOpen;
            sessionsXML += generateDoremiFilmColumn(uniqueFilms[f]);
            sessionsXML += rowClose;
        }

        sessionsXML += tableClose + "\n";
        sessionsXML += xmlScheduleClose;
    
        return sessionsXML;
    }

    getLegacyDolbyScheduleXML(sessions){
        let sessionsXML = '';
        return sessionsXML;
    }

    getScreenwriterXML(sessions, theaterId){
        let sessionsXML = '';
        return sessionsXML;
    }
}

function generateDoremiPerformanceColumn(session){
    let column = '';
    let datetime = session.start;
    let year = (session.start).substring(0, 4);
    let month = (session.start).substring(5, 7);
    let day = (session.start).substring(8, 10);
    let hour = parseInt((session.start).substring(11, 13));
    let minutes_seconds = (session.start).substring(14, 19);
    let meridiem;
    let tHour;
    if(hour <= 11){   
        meridiem = 'AM';
        if(hour === 0){
            tHour = '12';
        }
        else{
            if((hour < 10) & (hour >= 1)){
                tHour = '0' + hour.toString();
            }
            else{
                tHour = hour.toString();
            }

        }
    }
    else if(hour === 12){
        meridiem = 'PM';
        tHour = hour.toString();
    }
    else if (hour > 11){
        meridiem = 'PM';
        let tmp = hour - 12;
        if((tmp < 10) & (tmp >= 1)){
            tHour = '0' + tmp.toString();
        }
        else{
            tHour = tmp.toString();
        }


    }


    let dateTimeString = `${month}/${day}/${year} ${tHour}:${minutes_seconds} ${meridiem}`;
    let aud = (session.aud).substring(6, 11);
    
    
    let auditorium = parseInt(aud);

    let addString = `               <col name="feature_code" value="${session.movie_id_int}"/>` + "\n" +
                    `               <col name="number" value="${session.session_id}"/>` + "\n" +
                    `               <col name="datetime" value="${dateTimeString}"/>` + "\n" +
                    `               <col name="auditorium" value="${auditorium}"/>` + "\n";
                    
    

    return addString;
    
}

function generateDoremiFilmColumn(session){
    let short_title = (session.title).substring(0, 20);
    let full_title = (session.title).replace("&", "&amp;");
    // remove trailing whitespace if any
    let stTrimmed = (short_title.trim()).replace("&", "&amp;");
    let film = `            <col name="feature_code" value="${session.movie_id_int}"/>` + "\n" + 
               `            <col name="title" value="${full_title}"/>` + "\n" +
               `            <col name="short_title" value="${stTrimmed}"/>` + "\n";
    return film;
}

function returnFilms(scheduleArray){
    let films = [];
    scheduleArray.forEach(element => {
        if (!(films.find(e => e.movie_id === element.movie_id))){
            let o = {
                title: element.title,
                movie_id: element.movie_id,
                movie_id_int: element.movie_id_int
            }
            films.push(o);
        }
    });
    return films;
}