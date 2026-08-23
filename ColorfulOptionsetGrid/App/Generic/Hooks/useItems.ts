type DataSet = ComponentFramework.PropertyTypes.DataSet;


export const useItems = (dataset: DataSet) => {
    const items = dataset.sortedRecordIds.map((id) => {
        const entityIn = dataset.records[id];
        const attributes = dataset.columns.map((column) => ({ [column.name]: entityIn.getFormattedValue(column.name) }));
        return Object.assign({
            key: entityIn.getRecordId(),
            raw: entityIn
        }, ...attributes);
    });

    return {
        items
    };
}