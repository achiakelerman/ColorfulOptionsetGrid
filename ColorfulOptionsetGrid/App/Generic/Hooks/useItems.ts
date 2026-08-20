import * as React from 'react';
type DataSet = ComponentFramework.PropertyTypes.DataSet;


export const useItems = (dataset: DataSet) => {       
    const [items, setItems] = React.useState<any[]>([]);
     
    React.useEffect(() => {
        //workaround bug: search while on page >1, has 25 records, but totalResultCount is right   
        var totalResultCount = dataset.paging.totalResultCount != -1 ? dataset.paging.totalResultCount : 5000;
        setItems(dataset.sortedRecordIds.slice(0, Math.min(dataset.sortedRecordIds.length, totalResultCount)).map((id) => {                
            const entityIn = dataset.records[id];
            const attributes = dataset.columns.map((column) => ({[column.name]: entityIn.getFormattedValue(column.name)}));
            return Object.assign({
                    key: entityIn.getRecordId(),
                    raw : entityIn
                },
                ...attributes);
            }));
    }, [dataset]);  

    return {      
        items
    };
}