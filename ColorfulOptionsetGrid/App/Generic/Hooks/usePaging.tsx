/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */

import * as React from 'react';
type DataSet = ComponentFramework.PropertyTypes.DataSet;
import DataSetInterfaces = ComponentFramework.PropertyHelper.DataSetApi;


export const usePaging = (dataset: DataSet) => {    
    const [currentPage, setCurrentPage] = React.useState<number>(1);
    const recordIdsKey = dataset.sortedRecordIds.join("|");
    const isFirstPage = !dataset.paging.hasPreviousPage;
    const pageSize = Math.max(dataset.sortedRecordIds.length, 1);
    const displayedPage = isFirstPage ? 1 : currentPage;
    const totalCount = dataset.paging.totalResultCount;
    const firstItemNumber = totalCount === 0 ? 0 : (displayedPage - 1) * pageSize + 1;
    const lastItemNumber = totalCount === 0 ? 0 : firstItemNumber + dataset.sortedRecordIds.length - 1;
    const totalRecords = totalCount === -1 ? "5000+" : totalCount.toString();

    React.useEffect(() => {
        if (isFirstPage) {
            setCurrentPage(1);
        }
    }, [isFirstPage, recordIdsKey]);

  

    function moveToFirst(){        
        setCurrentPage(1);
        (dataset.paging as any).loadExactPage(1);
    }

    function movePrevious(){        
        const newPage = Math.max(currentPage - 1, 1);
        setCurrentPage(newPage);
        (dataset.paging as any).loadPreviousPage();
    }

    function moveNext(){        
        const newPage = currentPage+1;
        setCurrentPage(newPage);
        (dataset.paging as any).loadNextPage();
    }   

    return {       
        
        currentPage,
        firstItemNumber, 
        lastItemNumber, 
        totalRecords,
        moveToFirst, 
        movePrevious,
        moveNext,       

    }
}