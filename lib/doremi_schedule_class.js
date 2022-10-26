// Class based dormemi xml schema

export class DoremiSchedule {
    constructor()
    
    
}

/*<? xml version = "1.0" encoding = "UTF-8" ?>
    <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
        <xs:element name="table">
            <xs:complexType>
                <xs:sequence>
                    <xs:element ref="row" maxOccurs="unbounded" />
                </xs:sequence>
                <xs:attribute name="name" use="required">
                    <xs:simpleType>
                        <xs:restriction base="xs:string">
                            <xs:enumeration value="feature" />
                            <xs:enumeration value="performance" />
                        </xs:restriction>
                    </xs:simpleType>
                </xs:attribute>
            </xs:complexType>
        </xs:element>
        <xs:element name="schedule">
            <xs:complexType>
                <xs:sequence>
                    <xs:element ref="creator" minOccurs="0" />
                    <xs:element ref="table" minOccurs="2" maxOccurs="2" />
                </xs:sequence>
            </xs:complexType>
        </xs:element>
        <xs:element name="row">
            <xs:complexType>
                <xs:sequence>
                    <xs:element ref="col" minOccurs="3" maxOccurs="4" />
                </xs:sequence>
            </xs:complexType>
        </xs:element>
        <xs:element name="creator">
            <xs:simpleType>
                <xs:restriction base="xs:string" />
            </xs:simpleType>
        </xs:element>
        <xs:element name="col">
            <xs:complexType>
                <xs:attribute name="value" type="xs:string" use="required" />
                <xs:attribute name="name" use="required">
                    <xs:simpleType>
                        TMS.TD.001578.DRM Page 6 Version 1.0
                        Doremi Cinema LLC Confidential
                        <xs:restriction base="xs:string">
                            <xs:enumeration value="auditorium" />
                            <xs:enumeration value="datetime" />
                            <xs:enumeration value="feature_code" />
                            <xs:enumeration value="number" />
                            <xs:enumeration value="short_title" />
                            <xs:enumeration value="title" />
                        </xs:restriction>
                    </xs:simpleType>
                </xs:attribute>
            </xs:complexType>
        </xs:element>
    </xs:schema>
    */