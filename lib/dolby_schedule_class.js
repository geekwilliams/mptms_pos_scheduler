// Dolby schedule as class

export class DolbySchedule{
    constructor()
    
}

/*
<? xml version = "1.0" encoding = "UTF-8" ?>
    <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" elementFormDefault="qualified"
        attributeFormDefault="unqualified">
        <xs:element name="schedule">
            <xs:complexType>
                <xs:sequence>
                    <xs:element name="scheduleday" maxOccurs="unbounded">
                        <xs:complexType>
                            <xs:sequence>
                                <xs:element name="film" maxOccurs="unbounded">
                                    <xs:complexType>
                                        <xs:sequence>
                                            <xs:element name="performances">
                                                <xs:complexType>
                                                    <xs:sequence maxOccurs="unbounded">
                                                        <xs:element name="performance">
                                                            <xs:complexType>
                                                                <xs:attribute name="auditorium"
                                                                    type="xs:string" />
                                                                <xs:attribute name="showtime"
                                                                    type="xs:time" />
                                                            </xs:complexType>
                                                        </xs:element>
                                                    </xs:sequence>
                                                </xs:complexType>
                                            </xs:element>
                                        </xs:sequence>
                                        <xs:attribute name="code" />
                                        <xs:attribute name="title" type="xs:string" />
                                        <xs:attribute name="rating" />
                                        <xs:attribute name="runtime" type="xs:duration" />
                                    </xs:complexType>
                                </xs:element>
                            </xs:sequence>
                            <xs:attribute name="date" type="xs:date" />
                        </xs:complexType>
                    </xs:element>
                </xs:sequence>
                <xs:attribute name="theatrecode" type="xs:string" use="required" />
            </xs:complexType>
        </xs:element>
    </xs:schema>
*/