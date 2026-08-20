import * as React from 'react';
import { Stack } from '@fluentui/react/lib/Stack';
import { IconButton } from '@fluentui/react/lib/Button';
import { usePaging } from '../Hooks/usePaging';

type DataSet = ComponentFramework.PropertyTypes.DataSet;

export interface IGridFooterProps {
    dataset: DataSet;
    selectedCount: number;
}

export const GridFooter = ({ dataset, selectedCount }: IGridFooterProps) => {
    const {
        currentPage,
        firstItemNumber,
        lastItemNumber,
        totalRecords,
        moveToFirst,
        movePrevious,
        moveNext
    } = usePaging(dataset);

    return (<Stack grow horizontal horizontalAlign="space-between" >
        <Stack.Item className="ColorfulOptionsetGrid Footer">
            <Stack grow horizontal horizontalAlign="space-between" >
                <Stack.Item grow={1} align="center" >{firstItemNumber}-{lastItemNumber} מתוך {totalRecords}{/* ({selectedCount} נבחרו)*/}</Stack.Item>
                <Stack.Item grow={1} align="center" className="ColorfulOptionsetGrid FooterRight">
                    <IconButton className="ColorfulOptionsetGrid FooterIcon ArrowRight" iconProps={{ iconName: "Previous" }} onClick={moveToFirst} disabled={!dataset.paging.hasPreviousPage} />
                    <IconButton className="ColorfulOptionsetGrid FooterIcon ArrowRight" iconProps={{ iconName: "ReplyAlt" }} onClick={movePrevious} disabled={!dataset.paging.hasPreviousPage} />
                    <span >דף {currentPage}</span>
                    <IconButton className="ColorfulOptionsetGrid FooterIcon " iconProps={{ iconName: "ReplyAlt" }} onClick={moveNext} disabled={!dataset.paging.hasNextPage} />
                </Stack.Item>
            </Stack>
        </Stack.Item>
    </Stack>)
}

//FlickRight <