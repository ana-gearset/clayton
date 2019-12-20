import { LightningElement, track } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import getAllFormTemplates from '@salesforce/apex/FORM_ServiceGiftEntry.getAllFormTemplates';
import deleteFormTemplates from '@salesforce/apex/FORM_ServiceGiftEntry.deleteFormTemplates';
import cloneFormTemplate from '@salesforce/apex/FORM_ServiceGiftEntry.cloneFormTemplate';
import getDataImportSettings from '@salesforce/apex/UTIL_CustomSettingsFacade.getDataImportSettings';
import TemplateBuilderService from 'c/geTemplateBuilderService';
import { showToast, format } from 'c/utilTemplateBuilder';
import GeLabelService from 'c/geLabelService';

import FORM_TEMPLATE_INFO from '@salesforce/schema/Form_Template__c';
import FIELD_MAPPING_METHOD_FIELD_INFO from '@salesforce/schema/Data_Import_Settings__c.Field_Mapping_Method__c';
import TEMPLATE_LAST_MODIFIED_DATE_INFO from '@salesforce/schema/Form_Template__c.LastModifiedDate';

const ADVANCED_MAPPING = 'Data Import Field Mapping';
const DEFAULT_FIELD_MAPPING_SET = 'Migrated_Custom_Field_Mapping_Set';
const SUCCESS = 'success';
const IS_LOADING = 'isLoading';
const TEMPLATE_BUILDER_TAB_NAME = '{0}GE_Template_Builder';
const TEMPLATES_LIST_VIEW_NAME = '{0}Templates';

const TEMPLATES_LIST_VIEW_ICON = 'standard:visit_templates';
const TEMPLATES_TABLE_ACTIONS = [
    { label: 'Edit', name: 'edit' },
    { label: 'Clone', name: 'clone' },
    { label: 'Delete', name: 'delete' }
];

export default class GeTemplates extends NavigationMixin(LightningElement) {

    // Expose custom labels to template
    CUSTOM_LABELS = GeLabelService.CUSTOM_LABELS;

    @track templates;
    @track templatesTableActions = TEMPLATES_TABLE_ACTIONS;
    @track isAccessible = true;
    @track isLoading = true;
    currentNamespace;

    get templateBuilderCustomTabApiName() {
        const namespacePrefix = `${this.currentNamespace}__`;

        return this.currentNamespace ?
            format(TEMPLATE_BUILDER_TAB_NAME, [namespacePrefix])
            : format(TEMPLATE_BUILDER_TAB_NAME, ['']);
    }

    get templatesListViewApiName() {
        const namespacePrefix = `${this.currentNamespace}__`;

        return this.currentNamespace ?
            format(TEMPLATES_LIST_VIEW_NAME, [namespacePrefix])
            : format(TEMPLATES_LIST_VIEW_NAME, ['']);
    }

    get templatesListViewIcon() {
        return TEMPLATES_LIST_VIEW_ICON;
    }

    get formTemplateObjectApiName() {
        return FORM_TEMPLATE_INFO.objectApiName;
    }

    get sortTemplatesBy() {
        return TEMPLATE_LAST_MODIFIED_DATE_INFO.fieldApiName;
    }

    get templatesListViewComponent() {
        return this.template.querySelector('c-util-list-view[data-id="templatesListView"]');
    }

    connectedCallback() {
        this.init();
    }

    init = async () => {
        this.isAccessible = await this.checkPageAccess();

        if (this.isAccessible) {
            await TemplateBuilderService.init(DEFAULT_FIELD_MAPPING_SET);
            this.currentNamespace = TemplateBuilderService.namespaceWrapper.currentNamespace;
            this.templates = await getAllFormTemplates();
            this.isLoading = false;
        }
    }

    /*******************************************************************************
    * @description Method checks for page level access. Currently only checks
    * if Advanced Mapping is on from the Data Import Custom Settings.
    */
    checkPageAccess = async () => {
        const dataImportSettings = await getDataImportSettings();
        const isAdvancedMappingOn =
            dataImportSettings[FIELD_MAPPING_METHOD_FIELD_INFO.fieldApiName] === ADVANCED_MAPPING;
        let hasPageAccess = false;

        if (isAdvancedMappingOn) {
            hasPageAccess = true;
        } else {
            this.isLoading = hasPageAccess = false;
        }

        return hasPageAccess;
    }

    /*******************************************************************************
    * @description Method handles actions for the Templates list view table.
    *
    * @param {object} event: Event received from the utilListView component
    * containing action details.
    */
    handleTemplatesTableRowAction(event) {
        const actionName = event.detail.action.name;
        const row = event.detail.row;

        switch (actionName) {
            case 'edit':
                this.navigateToTemplateBuilder(row.Id);
                break;
            case 'clone':
                this.templatesListViewComponent.setProperty(IS_LOADING, true);

                cloneFormTemplate({ id: row.Id }).then((clonedTemplate) => {
                    this.templates = [...this.templates, clonedTemplate];
                    this.templatesListViewComponent.refreshImperativeQuery();
                    this.templatesListViewComponent.setProperty(IS_LOADING, false);
                });
                break;
            case 'delete':
                this.templatesListViewComponent.setProperty(IS_LOADING, true);

                deleteFormTemplates({ ids: [row.Id] }).then((formTemplateNames) => {
                    this.templatesListViewComponent.refreshImperativeQuery();
                    this.templatesListViewComponent.setProperty(IS_LOADING, false);
                    const toastMessage = GeLabelService.format(
                        this.CUSTOM_LABELS.geToastTemplateDeleteSuccess,
                        formTemplateNames);

                    showToast(toastMessage, '', SUCCESS);
                });
                break;
            default:
        }
    }

    /*******************************************************************************
    * @description Navigates to the Record Detail Page.
    *
    * @param {string} recordId: SObject Record ID
    */
    navigateToRecordViewPage(recordId) {
        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: {
                recordId: recordId,
                actionName: 'view'
            }
        });
    }

    /*******************************************************************************
    * @description Navigates to the Template Builder. If a recordId is provided,
    * adds the recordId to the navigation state (query param).
    *
    * @param {string} recordId: Record id of the Form_Template__c
    */
    navigateToTemplateBuilder(recordId) {
        const queryParameter = recordId ? { c__recordId: recordId } : {};

        this[NavigationMixin.Navigate]({
            type: 'standard__navItemPage',
            attributes: {
                apiName: this.templateBuilderCustomTabApiName
            },
            state: queryParameter
        });
    }

    /*******************************************************************************
    * @description Handles onclick event from 'Create Template' button and navigates
    * to the Template Builder.
    */
    handleNewFormTemplate() {
        this.navigateToTemplateBuilder();
    }

    /*******************************************************************************
    * @description Handles onclick event from 'New Batch' button and navigates
    * to the Form Renderer.
    */
    navigateToForm() {
        this[NavigationMixin.Navigate]({
            type: 'standard__component',
            attributes: {
                componentName: 'c__geFormRendererPlaceholder'
            }
        });
    }
}