import getRenderWrapper from '@salesforce/apex/GE_TemplateBuilderCtrl.retrieveDefaultSGERenderWrapper';
import getAllocationSettings from '@salesforce/apex/GE_FormRendererService.getAllocationsSettings';
import saveAndProcessGift from '@salesforce/apex/GE_FormRendererService.saveAndProcessSingleGift';
import { CONTACT_INFO, ACCOUNT_INFO, 
         DI_CONTACT1_IMPORTED_INFO, DI_ACCOUNT1_IMPORTED_INFO, 
         DI_DONATION_DONOR_INFO, CONTACT1, ACCOUNT1, handleError } from 'c/utilTemplateBuilder';
import saveAndDryRunRow
    from '@salesforce/apex/BGE_DataImportBatchEntry_CTRL.saveAndDryRunRow';
import {api} from "lwc";

// https://developer.salesforce.com/docs/atlas.en-us.apexcode.meta/apexcode/apex_enum_Schema_DisplayType.htm
// this list only includes fields that can be handled by lightning-input
const inputTypeByDescribeType = {
    'BOOLEAN': 'checkbox',
    'CURRENCY': 'number',
    'DATE': 'date',
    'DATETIME': 'datetime-local',
    'EMAIL': 'email',
    'DOUBLE': 'number',
    'INTEGER': 'number',
    'LONG': 'number',
    'PERCENT': 'number',
    'STRING': 'text',
    'PHONE': 'tel',
    'TEXT': 'text',
    'TIME': 'time',
    'URL': 'url'
};

const numberFormatterByDescribeType = {
  'PERCENT': 'percent-fixed'
};

class GeFormService {

    fieldMappings;
    objectMappings;
    fieldTargetMappings;

    /**
     * Retrieve the default form render wrapper.
     * @returns {Promise<FORM_RenderWrapper>}
     */
    @api
    getFormTemplate() {
        return new Promise((resolve, reject) => {
            getRenderWrapper({})
                .then((result) => {
                    this.fieldMappings = result.fieldMappingSetWrapper.fieldMappingByDevName;
                    this.objectMappings = result.fieldMappingSetWrapper.objectMappingByDevName;
                    this.fieldTargetMappings = result.fieldMappingSetWrapper.fieldMappingByTargetFieldName;
                    resolve(result);
                })
                .catch(error => {
                    handleError(error);
                });
        });
    }

    getAllocationSettings() {
        return new Promise((resolve, reject) => {
           getAllocationSettings()
               .then(resolve)
               .catch(handleError)
        });
    }

    /**
     * Get the type of lightning-input that should be used for a given field type.
     * @param dataType  Data type of the field
     * @returns {String}
     */
    getInputTypeFromDataType(dataType) {
        return inputTypeByDescribeType[dataType];
    }

    /**
     * Get the formatter for a lightning-input that should be used for a given field type
     * @param dataType  Data type of the field
     * @returns {String | undefined}
     */
    getNumberFormatterByDescribeType(dataType) {
        return numberFormatterByDescribeType[dataType];
    }

    /**
     * Get a field info object by dev name from the render wrapper object
     * @param fieldDevName  Dev name of the object to retrieve
     * @returns {BDI_FieldMapping}
     */
    getFieldMappingWrapper(fieldDevName) {
        return this.fieldMappings[fieldDevName];
    }

    /**
     * Get a field info object by dev name from the render wrapper object
     * @param fieldDevName  Dev name of the object to retrieve
     * @returns {BDI_FieldMapping}
     */
    getFieldMappingWrapperFromTarget(targetFieldName) {
        return this.fieldTargetMappings[targetFieldName];
    }

    /**
     * Get a object info object by dev name from the render wrapper object
     * @param objectDevName
     * @returns {BDI_ObjectMapping}
     */
    getObjectMappingWrapper(objectDevName) {
        return this.objectMappings[objectDevName];
    }

    /**
     * Takes a Data Import record and additional object data, processes it, and returns the new Opportunity created from it.
     * @param createdDIRecord
     * @param widgetValues
     * @returns {Promise<Id>}
     */
    saveAndProcessGift(createdDIRecord, widgetValues) {
        const widgetDataString = JSON.stringify(widgetValues);
        return new Promise((resolve, reject) => {
            saveAndProcessGift({diRecord: createdDIRecord, widgetData: widgetDataString})
                .then((result) => {
                    resolve(result);
                })
                .catch(error => {
                    console.error(JSON.stringify(error));
                    reject(error);
                });
        });
    }

    /**
     * Takes a list of sections, reads the fields and values, creates a di record, and creates an opportunity from the di record
     * @param sectionList
     * @returns opportunityId
     */
    handleSave(sectionList, record) {
        const { diRecord, widgetValues } = this.getDataImportRecord(sectionList, record);

        const opportunityID = this.saveAndProcessGift(diRecord, widgetValues);

        return opportunityID;
    }

    /**
     * Grab the data from the form fields and widgets, convert to a data import record.
     * @param sectionList   List of ge-form-sections on the form
     * @param record        Existing account or contact record to attach to the data import record
     * @return {{widgetValues: {}, diRecord: {}}}
     */
    getDataImportRecord(sectionList, record){
        // Gather all the data from the input
        let fieldData = {};
        let widgetValues = {};

        sectionList.forEach(section => {
            fieldData = { ...fieldData, ...(section.values)};
            widgetValues = { ...widgetValues, ...(section.widgetValues)};
        });

        // Build the DI Record
        let diRecord = {};  

        for (let key in fieldData) {
            if (fieldData.hasOwnProperty(key)) {
                let value = fieldData[key];

                // Get the field mapping wrapper with the CMT record name (this is the key variable).
                let fieldWrapper = this.getFieldMappingWrapper(key);

                diRecord[fieldWrapper.Source_Field_API_Name] = value;
            }
        }

        if (record) {
            // set the bdi imported fields for contact or account
            if (record.apiName === CONTACT_INFO.objectApiName) {
                diRecord[DI_CONTACT1_IMPORTED_INFO.fieldApiName] = record.id;
                diRecord[DI_DONATION_DONOR_INFO.fieldApiName] = CONTACT1;
            } else if (record.apiName === ACCOUNT_INFO.objectApiName) {
                diRecord[DI_ACCOUNT1_IMPORTED_INFO.fieldApiName] = record.id;
                diRecord[DI_DONATION_DONOR_INFO.fieldApiName] = ACCOUNT1;
            }
        }

        return { diRecord, widgetValues };
    }

    saveAndDryRun(batchId, dataImport) {
        return new Promise((resolve, reject) => {
            saveAndDryRunRow({batchId: batchId, dataImport: dataImport})
                .then((result) => {
                    resolve(JSON.parse(result));
                })
                .catch(error => {
                    reject(error);
                });
        });
    }

}

const geFormServiceInstance = new GeFormService();

export default geFormServiceInstance;