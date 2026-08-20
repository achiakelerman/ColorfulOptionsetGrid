// import { useEffect, useState } from 'react';
// import { IInputs } from '../../generated/ManifestTypes';
// import './tile.css'

// //export interface TileItem {
// //    mainItem: any;
// //}

// export interface TileProps {
//     context: ComponentFramework.Context<IInputs>;
//     item: any;
// }

// export interface TileState {
//     woId: string;
//     fullName: string;
//     subStatus?: string;
//     contactId?: string;
//     idNumber?: string;
//     bikurDT?: string;
//     phone?: string;
//     address?: string;
//     encodedAddress?: string;
//     age?: number;
//     ageStr?: string;
//     gender?: number;
//     img_url?: string;
// }

// export const addressOnClick = function (event: any, address: string): void {
//     if (address !== null) {
//         window.open(`https://waze.com/ul?q=${address}`);
//     }
//     else
//         alert("no address");
// }



// export enum GenderAge {
//     Avatar = "el_avatar.svg",
//     Boy_0_3 = "el_boy_0_3.svg",
//     Boy_4_19 = "el_boy_3_19.svg",
//     Man_20_120 = "el_man_19_120.svg",
//     Girl_0_3 = "el_girl_0_3.svg",
//     Girl_4_19 = "el_girl_3_19.svg",
//     Woman_20_120 = "el_woman_19_120.svg"
// }

// export const Tile: React.FC<TileProps> = ({ context, item }) => {

//     const recordOnDoubleClick = function (event: any, entityId: string): void {
//         context.navigation.openForm({
//             entityName: "msdyn_workorder",
//             entityId: entityId,
//             openInNewWindow: true
//         });
//     }

//     const [data, setData] = useState<TileState>({
//         woId: item.key,
//         //bikurDT: "'not defined'",
//         fullName: item.msdyn_reportedbycontact
//     });

//     useEffect(() => {
//         async function fetchData() {
//             try {
//                 const wo = await context.webAPI.retrieveRecord("msdyn_workorder", data.woId, "?$select=_msdyn_reportedbycontact_value,msdyn_timefrompromised,new_pl_workordersubstatus");

//                 debugger // eslint-disable-line no-debugger

//                 if (wo.msdyn_timefrompromised) {
//                     setData({
//                         ...data,
//                         subStatus: (wo['new_pl_workordersubstatus@OData.Community.Display.V1.FormattedValue']),
//                         bikurDT: (wo['msdyn_timefrompromised@OData.Community.Display.V1.FormattedValue'])
//                     });
//                 }

//                 const contactId = wo._msdyn_reportedbycontact_value;

//                 if (contactId) {

//                     const result = await context.webAPI.retrieveRecord("contact", contactId,
//                         "?$select=firstname,middlename,lastname,fullname,governmentid,new_dt_dob,mobilephone,address1_line1,gendercode,address1_city,telephone1");

//                     const firstName = result["firstname"] || "";
//                     const middleName = result["middlename"] || "";
//                     const lastName = result["lastname"] || "";
//                     const fullname = result["fullname"] || "";
//                     const gender = result["gendercode"] || 0;
//                     const governmentid = result["governmentid"] || undefined;
//                     const new_dt_dob = result["new_dt_dob"] || "";
//                     const mobilephone = result["mobilephone"] || "";
//                     const address1_line1 = result["address1_line1"] || "";
//                     const address1_city = result["address1_city"] || "";
//                     const phone = result["telephone1"] || "";
//                     const address = address1_line1 + ", " + address1_city;
//                     const encodedAddress = encodeURIComponent(address);
//                     const phoneStr = "טלפון: " + phone;
//                     const mobileStr = "נייד: " + mobilephone;
//                     var today = new Date();
//                     let age =
//                         new_dt_dob == ""
//                             ? undefined
//                             : (today.getFullYear() - new Date(new_dt_dob).getFullYear());

//                     let ageStr = "";

//                     // @ts-ignore
//                     // eslint-disable-next-line no-undef
//                     const webResourceUrl = Xrm.Utility.getGlobalContext().getClientUrl() + "//WebResources/";

//                     let img_url = webResourceUrl + GenderAge.Avatar;

//                     if (isNaN(parseInt(gender)) || parseInt(gender) == 0) {
//                         if (!age) {
//                             img_url = webResourceUrl + GenderAge.Avatar;
//                         }
//                         else {
//                             ageStr = "גיל " + age;
//                             img_url = webResourceUrl + GenderAge.Avatar;
//                         }
//                     }
//                     else {
//                         if (!age) {
//                             ageStr = "";
//                             img_url = webResourceUrl + GenderAge.Avatar;
//                         }
//                         else {
//                             if (parseInt(gender) == 1) {
//                                 ageStr = "בן " + age;
//                                 if (age >= 0 && age <= 3) {
//                                     img_url = webResourceUrl + GenderAge.Boy_0_3;
//                                 }
//                                 else if (age >= 4 && age <= 19) {
//                                     img_url = webResourceUrl + GenderAge.Boy_4_19;
//                                 }
//                                 else if (age >= 20 && age <= 120) {
//                                     img_url = webResourceUrl + GenderAge.Man_20_120;
//                                 }
//                             }
//                             else if (parseInt(gender) == 2) {
//                                 ageStr = "בת " + age;
//                                 if (age >= 0 && age <= 3) {
//                                     img_url = webResourceUrl + GenderAge.Girl_0_3;
//                                 }
//                                 else if (age >= 4 && age <= 19) {
//                                     img_url = webResourceUrl + GenderAge.Girl_4_19;
//                                 }
//                                 else if (age >= 20 && age <= 120) {
//                                     img_url = webResourceUrl + GenderAge.Woman_20_120;
//                                 }
//                             }
//                         }
//                     }

//                     setData({
//                         ...data,
//                         contactId: contactId,
//                         age: age,
//                         ageStr: ageStr,
//                         address: address,
//                         gender: gender,
//                         idNumber: (governmentid ? (" ת.ז. " + (governmentid ?? "'not defined'")) : undefined),
//                         phone: mobilephone,
//                         img_url: img_url,
//                         encodedAddress: encodedAddress,
//                         subStatus: (wo['new_pl_workordersubstatus@OData.Community.Display.V1.FormattedValue']),
//                         bikurDT: (wo['msdyn_timefrompromised@OData.Community.Display.V1.FormattedValue'])
//                     });
//                 }

//             } catch (error) {
//                 console.error("Ошибка при загрузке данных:", error);
//             }
//         }

//         fetchData();
//     }, []);


//     const styleFullName = { fontWeight: "bold" };
//     const styleParagraph = { marginTop: "5px" };

//     //const woId = item.mainItem.key;

//     //const idNumber = "142968785";
//     //const phone = "0509853475";
//     //const address = "שד' רבין 10, חולון";
//     //const age = 26;
//     //const gender = 1;
//     //let img_url = "";

//     // @ts-ignore
//     // eslint-disable-next-line no-undef

//     return (
//         <div className="tile" onDoubleClick={(e) => recordOnDoubleClick(e, data.woId)} >
//             <table>
//                 <tr>
//                     <td>
//                         <p style={styleParagraph}><span style={styleFullName}>{data.fullName}</span>{/*<span>{"  " + data.ageStr}</span>*/}</p>
//                         {data.bikurDT ? <span  >{(data.bikurDT)}</span> : (<p></p>)}
//                         {/*{data.idNumber && < p style={styleParagraph}>{data.idNumber}</p>}*/}
//                         {data.phone && <p style={styleParagraph}><a href={"tel:" + data.phone} >{data.phone}</a></p>}
//                         {data.address && <p style={styleParagraph}><a href={`https://waze.com/ul?q=${data.address}`} target="_blank" rel="noreferrer" >{data.address}</a></p>}
//                     </td>
//                     <td width="30%" align="right" style={{ paddingTop: "50px" }} >
//                         {data.subStatus ? <span  >{(data.subStatus)}</span> : (<p></p>)}
//                         {/*{data.bikurDT ? <span  >{(data.bikurDT)}</span> : (<p></p>)}*/}
//                         {/*style={{ marginTop: "50px", fontStyle: "italic" }}*/}
//                     </td>
//                     <td width="20%" height="70px" align="left" >
//                         <div className='image_container' >
//                             <img src={data.img_url}></img>
//                         </div>
//                     </td>
//                 </tr>
//             </table>
//         </div>
//     );
// }
