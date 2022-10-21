import * as dotenv from 'dotenv' 
dotenv.config()


const location_code = process.env.LOCATION_CODE;
const pos_server = process.env.POS_SERVER; 
const tms_server = process.env.TMS_SERVER;
const tms_server_type = process.env.TMS_SERVER_TYPE;
const update_delay = ((process.env.UPDATE_DELAY * 60) * 1000);  // get milliseconds

// get guid for location

let location;
switch(location_code){ 
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
        1. Define time loop (based on env.UPDATE_DELAY)
        
        2. Get sessions via soap from POSitive

        3. Get human friendly session titles from POSitive

        4. Create xml schedule based on schema of 
            - Dolby LMS
            - Dolby TMS
            - Screenwriter

        5. Generate bookend schedules for LMS and TMS

        6. push file
*/


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

const update_interval = setInterval(() => {

}, update_delay);

function stdOutLogger(output) {
    let m = new Date();
    let dateString =
    m.getUTCFullYear() + "/" +
    ("0" + (m.getUTCMonth()+1)).slice(-2) + "/" +
    ("0" + m.getUTCDate()).slice(-2) + " " +
    ("0" + m.getUTCHours()).slice(-2) + ":" +
    ("0" + m.getUTCMinutes()).slice(-2) + ":" +
    ("0" + m.getUTCSeconds()).slice(-2);
    let message = "[ " + dateString + " ]   " + output;
    return message;
}

stdOutLogger("HELLO");