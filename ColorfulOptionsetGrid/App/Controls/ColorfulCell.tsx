/* eslint-disable no-unused-vars */
import * as React from 'react';
import { debug } from 'util';
import { IGridColumn } from '../Generic/Hooks/useColumns';
import { ISetupSchemaValue } from '../Utils/interfaces';
import { ColorfulCellItem } from './ColorfulCellItem';
import Panel from './Panel';
// import { Popup, PopupProps } from './Popup';
// import ToggleButton from './ToggleButton';
import { IInputs } from '../../generated/ManifestTypes';

export interface IColorfulCellProps {
    context: ComponentFramework.Context<IInputs>;
    item: any;
    column: IGridColumn;
    metadataOptions: Map<string, ISetupSchemaValue> | undefined;
    displayTextType: "SIMPLE" | "BOX" | "BORDER" | "NOTEXT";
    displayIconType: "NONE" | "NAME";//| "ENVIRONMENT";
    defaultIcon: string;
    onChange: ((id: string, columnName: string, value: number) => void) | undefined
}

const leftArrowStyle: any = {
    //border: 1px solid var(--gray-300);
    border: '1px solid #C3C9D7',
    borderRadius: '4px',
    opacity: 1
}

const detailsButtonStyle: any = {
    background: '0% 0% no-repeat padding-box',
    border: 0
}

const divCenterAlign: any = {
    height: '100%',
    display: 'flex',
    justifyContent: 'center', /* горизонтальное выравнивание */
    alignItems: 'center'     /* вертикальное выравнивание */
}

export const handleLeftArrowButtonClick = function (event: any, id: string): void {
    alert(`selected id = ${id}`);
}

// export const handOpenFileButtonClick = function (event: any, id: string, fileId: string): void {
//     if (fileId !== null) {
//         //window.open(`https://orgb52b55b7.crm4.dynamics.com/api/data/v9.0/msdyn_workorders(${id})/el_mainfile/$value`, "_blank", "noreferrer");
//         window.open(`https://orgb52b55b7.crm4.dynamics.com/api/data/v9.0/msdyn_workorders(${id})/el_mainfile/$value`);
//     }
//     else
//         alert("no file");
// }

export const ColorfulCell = function ColorfulCell({ context, item, column, metadataOptions, displayTextType, displayIconType, defaultIcon, onChange }: IColorfulCellProps): JSX.Element {
    let currentItem = item.item;
    let { handleDetailsButtonClick } = item;

    // let [popup, setPopup] = React.useState({
    //     record: null,
    //     visible: false,
    //     x: 0,
    //     y: 0,
    // });

    const [isPanelVisible, setPanelVisibility] = React.useState(false);
    const [activeRowIndex, setActiveRowIndex] = React.useState<string | null>(null);

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Element;
            if (activeRowIndex !== null && !target.closest('.panel')) {
                setActiveRowIndex(null);
            }
        };

        document.addEventListener('click', handleClickOutside);

        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
    }, [activeRowIndex]);

    const onClick = onChange != null ? (value: number) => {
        if (onChange != null) {
            onChange(currentItem.raw.getRecordId(), column.original.name, value);
        }
    } : undefined;

    const setGenderAndAge = (gender: string, age: string): string => {
        // @ts-ignore
        // eslint-disable-next-line no-undef

        if (isNaN(parseFloat(age))) {
            return "";
        }
        
        if (isNaN(parseInt(gender))) {
            //if (isNaN(parseFloat(age))) {
                //return "";
            //}
            //else {
                return "גיל " + age;
            //}
        }
        else {
            //if (isNaN(parseFloat(age))) {
            //    return "";
            //}
            //else {
                if (parseInt(gender) == 1) {
                    return "בן " + age;
                }
                else if (parseInt(gender) == 2) {
                    return "בת " + age;
                }
            //}
        }

        return "";
    }
    if (column.original.name == 'el_id_contact') {
        const _id = currentItem.raw.getValue(column.original.name)?.id?.guid ?? "[no guid]";
        var _div = <div/>;
        if (_id != "[no guid]") {
            let alias = (context.parameters.dataset.linking.getLinkedEntities().filter(l => l.to == "el_id_contact")).at(0)?.alias;

            const firstName = currentItem.raw.getValue(alias + ".firstname") || "";
            const lastName = currentItem.raw.getValue(alias + ".lastname") || "";
            const fullName = (firstName != "" && lastName != "") ? firstName + " " + lastName : (firstName + lastName);

            const homeVisitCount = currentItem.raw.getValue(alias + ".el_n_open_homevisit_sum");

            const gender = currentItem.raw.getValue(alias + ".el_gp_member_gender") || 0;
            const age = currentItem.raw.getValue(alias + ".el_s_age") || "";
            const ageAndGender = setGenderAndAge(gender, age);

            const memberId = currentItem.raw.getValue(alias + ".el_s_member_id") || "";
            const idNumber = (memberId != "") ? "ת.ז " + memberId : "";
            const details = ((ageAndGender != "" && memberId != "") ? ageAndGender + ", " + idNumber : ageAndGender + idNumber);
            
            _div = <div className='ColorfulOptionsetGrid patient-details'>
                    <div className='patient-top'>
                        <span className='patient-name' title={fullName}>{fullName}</span>
                        {(homeVisitCount > 1) && (<span className='home-visit-count' title={homeVisitCount}>{homeVisitCount}</span>)}
                    </div>
                    <span title={details}>{details}</span>
                 </div>
        }

        return _div;
    }
    else if (column.original.name == 'el_b_homevisiturgency') {
        const urgency = currentItem.raw.getValue(column.original.name);
        if (urgency == true)
            return <div style={{
                margin: "auto",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: "100%"
            }}><img style={{ height: "25px", width: "auto" }} src="/WebResources/el_urgency_icon.png"></img></div>
        return <div/>;
    }
  /*  else if (column.original.name == 'el_s_treatments_types_search') {
        const _valueTreatments = currentItem.raw.getFormattedValue(column.original.name) ?? "";
        let medicines = currentItem.raw.getFormattedValue("el_s_medicines_search") ?? "";

        return <div style={{ margin: "3px" }} title={_valueTreatments + ((medicines != "") ? ", תרופות: " + medicines : "")}>
            <span style={{ display: "block" }} >{_valueTreatments}</span>
            {(medicines != "") && (<span style={{ display: "block" }}><span style={{ fontWeight: "600" }}>תרופות: </span>{medicines}</span>)}
        </div>;
    }*/
    else if (column.original.name == 'el_s_mobile_number')    {
        let _value = currentItem.raw.getValue(column.original.name) ?? "";
        if (_value == "")
            _value = currentItem.raw.getValue("el_s_phone_number") ?? "";

        return <div style={{ margin: "3px" }}>
            <span title={_value}>{_value}</span>
        </div>;
    }
    // else if (column.original.name == 'el_mainfile') {
    //     var _id = currentItem.key;

    //     var _fileId = currentItem.el_mainfile;

    //     return <div style={divCenterAlign} ><button style={leftArrowStyle} onClick={(e) => handOpenFileButtonClick(e, _id, _fileId)} >◀   {currentItem.raw.getValue(column.original.name)}</button></div>;
    // }
    // else if (column.original.name == 'msdyn_latitude') {
    //     return <div style={divCenterAlign} ><button style={leftArrowStyle} onClick={(e) => handleLeftArrowButtonClick(e, "abra-kadabra 🏠")} >◀</button></div>;
    // }
    // else if (column.original.name == 'msdyn_longitude') {
    //     return <div style={divCenterAlign} >
    //         {/*<Popup {...{ ...popup, record: item } } />*/}
    //         {/*<button style={detailsButtonStyle} onClick={(e) => handleLeftArrowButtonClick(e, "abra-kadabra 🏠")} >&#65049;*/}
    //         {/*</button>*/}

    //         {activeRowIndex === currentItem.key && <Panel />}
    //         <ToggleButton onClick={(event) => {
    //             //event.stopPropagation();
    //             //if (activeRowIndex === currentItem.key) {
    //             //    setActiveRowIndex(null);
    //             //} else {
    //             //    setActiveRowIndex(currentItem.key);
    //             //}
    //             handleDetailsButtonClick(event, currentItem);
    //         }} />
    //     </div>;
    // }
    else if (column.original.dataType === "MultiSelectOptionSet" || column.original.dataType === "MultiSelectPicklist") {
        const currentValues = (currentItem.raw.getValue(column.original.name) as string ?? "").split(","); // TODO change to ; ?
        const currentDisplayNames = (currentItem.raw.getFormattedValue(column.original.name) as string ?? "").split(";");
        return (<div className="ColorfulOptionsetGrid ColorfulCell_MultiSelectOptionSet">
            {currentValues.map((currentValue, index) => {
                return (<ColorfulCellItem className='ColorfulOptionsetGrid ColorfulCellItem' key={currentValue}
                    currentValue={currentValue == "" || currentValue == null ? undefined : parseInt(currentValue)}
                    currentDisplayName={currentDisplayNames[index] ?? ""}
                    defaultIcon={defaultIcon}
                    displayIconType={displayIconType}
                    displayTextType={displayTextType}
                    metadataOptions={metadataOptions}
                    onChange={undefined}
                />)
            })}
        </div>)
    }
    else if (column.original.dataType === "OptionSet" || column.original.dataType === "Picklist") {
        const tmp = {
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: "0px",
            width: "100%",
            height: "100%",
            testAlign: "center",
        };

        const currentOptionSetValue = currentItem.raw.getValue(column.original.name) as number;
        return (<div style={tmp} className={onChange != undefined ? "ColorfulOptionsetGrid ColorfulCellEditable" : undefined}>
            <ColorfulCellItem className='ColorfulOptionsetGrid ColorfulCell'
                currentValue={currentOptionSetValue}
                currentDisplayName={currentItem[column.original.name]}
                defaultIcon={defaultIcon}
                displayIconType={displayIconType}
                displayTextType={displayTextType}
                metadataOptions={metadataOptions}
                onChange={onClick}
            /></div>);
    }
    else {
        const value = currentItem.raw.getFormattedValue(column.original.name);

        return <div>
                <span style={{display: "block", margin: "3px"}} title={value}>{value}</span>
            </div>
    }
};