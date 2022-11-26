import xml2js from 'xml2js';
import { HttpPost } from "./httpPost.js";

export class SoapRequest {
    constructor(uri){
        this.uri = uri;
        this.port = 9101;
    };

    getPOSScreeningSessions(guid, date_from, date_to){
        return new Promise((resolve, reject) => {
            let request = new HttpPost(this.uri, '/PositiveCinemaSalesAPI.asmx', this.port);
            let request_string = POSInfoSoap(guid, date_from, date_to);
            request.POST(request_string)
                .then(response => {
                    let parser = new xml2js.Parser({ ignoreAttrs: true });
                    if(response){
                        parser.parseString(response, (err, result) => {
                            if(err){
                                reject(err);
                            }
                            
                            let arr = result['soap:Envelope']['soap:Body'][0].GetShowtimesByCinemaDateResponse[0].GetShowtimesByCinemaDateResult[0].Screenings[0].Seance;
                            resolve(arr);
                        }); 
                    }
                    else{
                        reject({status: 1, error_string: 'getPOSScreeningSessions: POST returned a null response'});
                    }
                    
                })
                .catch(e => {
                    reject(e);
                });

        });
    }
}

function POSInfoSoap(guid, date_from, date_to){
    let body = 
    `<?xml version="1.0" encoding="utf-8"?>
    <soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
        <soap12:Body>
            <GetShowtimesByCinemaDate xmlns="lsisoftware">
                <RequestData>
                    <CinemaId>${guid}</CinemaId> 
                    <DateFrom>${date_from}</DateFrom>
                    <DateTo>${date_to}</DateTo>
                </RequestData>
            </GetShowtimesByCinemaDate>
        </soap12:Body>
    </soap12:Envelope>`
    return body; 
}

