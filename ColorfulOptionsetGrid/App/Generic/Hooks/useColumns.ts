/* eslint-disable no-undef */
import * as React from 'react';
type DataSet = ComponentFramework.PropertyTypes.DataSet;
import DataSetInterfaces = ComponentFramework.PropertyHelper.DataSetApi;

//for 6
export interface IColumnFeature {
    width: number;
    isVisible?: boolean;
    order?: number;
}

export type ColumnWidthCallback = (column: ComponentFramework.PropertyHelper.DataSetApi.Column, preCalculatedWidth: number) => number;

export interface IGridColumn {
    original: ComponentFramework.PropertyHelper.DataSetApi.Column;
    features: IColumnFeature,
    minWidth: number;
    maxWidth: number;
}

interface IGridColumnAggregates {
    sum: number;
    count: number;
}

interface IColumnsHookState {
    calculatedColumns: IGridColumn[],
    aggregates: IGridColumnAggregates
}

function calculateAggregatesBasedOnFeatures(cols: IGridColumn[]): IGridColumnAggregates {
    return cols.reduce(({ sum, count }, column) => {
        return {
            sum: sum + (column.features.isVisible === true ? column.features.width : 0) + 14,
            count: count + (column.features.isVisible === true ? 1 : 0)
        };
    }, { sum: 0, count: 0 });
}



function parseColumns(originalColumns: ComponentFramework.PropertyHelper.DataSetApi.Column[], columnWidthCallback?: ColumnWidthCallback): IColumnsHookState {
    const calculatedColumns = originalColumns.filter((column) => column.order > -1).map((column) => { //in canvas apps, columnset is 1
        const preCalculatedWidth = column.visualSizeFactor === -1 ? 75 : column.visualSizeFactor;
        const width = columnWidthCallback !== undefined
            ? columnWidthCallback(column, preCalculatedWidth)
            : preCalculatedWidth;
        return {
            original: column,
            features: {
                width: width,
                isVisible: !column.isHidden === true && hidenColumns.every(c => !column.name.includes("." + c)),
                isSortable: column.dataType != "MultiSelectPicklist",
                order: column.order === -1 ? 100 : column.order,
            },
            minWidth: 0,
            maxWidth: 0
        }
    }).sort((c1, c2) => c1.features.order - c2.features.order);
    return {
        calculatedColumns,
        aggregates: calculateAggregatesBasedOnFeatures(calculatedColumns)
    }
}

const hidenColumns = [
    "firstname",
    "lastname",
    "el_gp_member_gender",
    "el_s_age",
    "el_s_member_id",
    "el_n_open_homevisit_sum",
    "el_s_medicines_search",
    "el_s_phone_number",
    "el_gp_status_visit_unit"
    // "el_s_street_synonym",
    // "el_s_house_number",
    // "el_id_city_synonym",
    // "el_s_member_cell_phone_number",
    // "el_s_member_phone_number"
 ]; 

function recalculateWidth(calculatedColumns: IGridColumn[], aggregates: IGridColumnAggregates, availableWidth?: number): IGridColumn[] {
    const aggregatedWidth = aggregates.sum;// + 50;           
    const widthBuffer = (availableWidth != null && availableWidth > aggregatedWidth) ? Math.round((availableWidth - aggregatedWidth) / aggregates.count) : 0;

    return calculatedColumns.filter((x) => x.original.isPrimary == false && hidenColumns.every(c => !x.original.name.includes(c))).map((intermediateColumn) => ({
        original: intermediateColumn.original,
        features: intermediateColumn.features,
        minWidth: intermediateColumn.features.width,
        maxWidth: intermediateColumn.features.width + widthBuffer
    }));
}

export const getDefaultColumnSetup = (column: IGridColumn, dataset: DataSet) => {
    const sortNode = dataset.sorting.find((sort) => sort.name === column.original.name);
    return {
        key: column.original.name,
        name: renameColumns(column.original.displayName),
        //name: column.original.displayName.indexOf("טלפון") >= 0 ? "טלפון" : column.original.displayName,
        fieldName: column.original.name,
        minWidth: column.minWidth,
        maxWidth: column.maxWidth,
        isResizable: true,
        isSorted: sortNode?.sortDirection === 0 || sortNode?.sortDirection === 1,
        isSortedDescending: sortNode?.sortDirection === 1,
        sortAscendingAriaLabel: "A-Z",
        sortDescendingAriaLabel: "Z-A",
        className: "ColorfulOptionsetGrid divWithBorder",
        isMultiline: true,
    }
}

export const renameColumns = (colName: string) =>  {
    if (colName == "מטופל")
        return "פרטי מטופל";
    else if (colName == "נייד")
        return "טלפון";
    else if (colName == "דחיפות")
        return "דחיפות";
    else if  (colName == "כתובת לביצוע ביקור")
        return "כתובת"; 
    else if  (colName == "ביקור - משובץ ל")
        return "משובץ ל";
    else if  (colName == "סוג טיפול לחיפוש")
        return "טיפולים";
    else if (colName == "תאריך יצירת הפניה")
        return "נוצר ב";
    else if (colName == "מרחב")
        return "מרחב מטופל";
    // else if (colName == "קובץ הפניה")
    //     return "צפייה בהפניה";
    // else if (colName == "קו רוחב")
    //     return "צפייה בהפניה";
    // else if (colName == "קו אורך")
    //     return "פעולות נוספות";
    else
        return colName;
}

export const useColumns = (dataset: DataSet, availableWidth?: number, columnWidthCallback?: ColumnWidthCallback) => {
    const [state, setState] = React.useState<IColumnsHookState>({ calculatedColumns: [], aggregates: { sum: 0, count: 0 } });
    const [columns, setColumns] = React.useState<IGridColumn[]>(recalculateWidth(state.calculatedColumns, state.aggregates, availableWidth));
    const [sorting, setSorting] = React.useState<DataSetInterfaces.SortStatus[]>(dataset.sorting);

    function onColumnClick(columnClicked: string) {
        const oldSorting = (sorting || []).find((sort) => sort.name === columnClicked);
        if (dataset.columns.find((column) => column.name === columnClicked)?.dataType === "MultiSelectPicklist") {
            return; //This column is not sortabke
        }
        const newValue: DataSetInterfaces.SortStatus = {
            name: columnClicked,
            sortDirection: oldSorting != null ? (oldSorting.sortDirection === 0 ? 1 : 0) : 0 //0 = ascendinf
        };
        while (dataset.sorting.length > 0) {
            dataset.sorting.pop();
        }
        dataset.sorting.push(newValue);
        //(dataset.paging as any).loadExactPage(1);
        dataset.paging.reset();
        dataset.refresh();
        setSorting(dataset.sorting);
    }


    React.useEffect(() => {
        const tempState = parseColumns(dataset.columns, columnWidthCallback);
        setState(tempState);
    }, [dataset]);

    React.useEffect(() => {
        const myState = state.calculatedColumns.length === 0 ? parseColumns(dataset.columns, columnWidthCallback) : state;
        setColumns(recalculateWidth(myState.calculatedColumns, myState.aggregates, availableWidth));
    }, [availableWidth, state]);

    return {
        columns,
        onColumnClick
    };
}