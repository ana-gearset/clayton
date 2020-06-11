*** Settings ***

Resource        robot/Cumulus/resources/NPSP.robot
Library         cumulusci.robotframework.PageObjects
...             robot/Cumulus/resources/ContactPageObject.py
...             robot/Cumulus/resources/NPSPSettingsPageObject.py
...             robot/Cumulus/resources/CustomizableRollupsPageObject.py
...             robot/Cumulus/resources/OpportunityPageObject.py
...             robot/Cumulus/resources/ObjectMangerPageObject.py
...             robot/Cumulus/resources/AccountPageObject.py
...             robot/Cumulus/resources/SchedulePaymentPageObject.py
...             robot/Cumulus/resources/NPSP.py
Suite Setup     Run keywords
...             Open Test Browser
Suite Teardown  Delete Records and Close Browser


*** Variables ***
&{contact1_fields}       Email=test@example.com
&{payment_fields}        Amount=833.34   NumPayments=6   Interval=1

*** Test Cases ***

Total Current Year Payments on Prior Year Pledges
    [Documentation]       Calculates Total Current Year Payments on Prior Year opportunity Pledges

    [tags]                            unstable                          W-037650                           feature:crlps
    # Create the required currency field and formula fields

    Validate And Create Required CustomField
    ...                                                    Object=Account
    ...                                                    Field_Type=Currency
    ...                                                    Field_Name=This Year Payments on Past Year Pledges

    Validate And Create Required CustomField
    ...                                                    Object=Payment
    ...                                                    Field_Type=Formula
    ...                                                    Field_Name=Is Opportunity From Prior Year
    ...                                                    Formula=YEAR( npe01__Opportunity__r.CloseDate ) < YEAR( npe01__Payment_Date__c )

    Enable Customizable Rollups

    # Create a Filter group and CRLP setting after checking prior records do not check if element exists

    Load Page Object                                      Custom                          CustomRollupSettings
    Navigate To Crlpsettings
    ${dict}=         Create Dictionary     Name=Old Payments    Description=Includes payments where the Opportunity Close Date year is older than the year of the Payment.
    ${dict1}=        Create Dictionary     Object=Payment       Field=Paid   Operator=Equals   Value=True
    ${dict2}=        Create Dictionary     Object=Payment    Field=Is Opportunity From Prior Year     Operator=Equals   Value=True
    ${filterPools}=  Create List           ${dict1}       ${dict2}

    Create New Filter Setting
    ...                                                   @{filterPools}
    ...                                                   &{dict}
    Enable Customizable Rollups
    Load Page Object                                       Custom                          CustomRollupSettings
    Navigate To Crlpsettings
    Create New Rollup Setting
        ...                                                Target Object=Account
        ...                                                Target Field=This Year Payments on Past Year Pledges
        ...                                                Description=Shows Payments made this year for pledges (Opportunities) from the prior year.

        ...                                                Operation=Sum
        ...                                                Time Frame=Years Ago
        ...                                                Years Ago=This Year
        ...                                                Rollup Type=Payment -> Account (Hard Credit)

        ...                                                Filter Group=Old Payments
        ...                                                Date Field=Payment: Payment Date


    # Create an opportunity for prior year that has 6 payments associated with a contact .
    # Ensure that Two of the payments were done the current year and one is paid last year.
    ${opp_date} =            Get Current Date    result_format=%Y-%m-%d    increment=-365 days
    ${payment_fields} =      Create Dictionary   Amount=833.34   NumPayments=6   Scheduledate=${opp_date}      Interval=1   Paid=3
    ${opportunity_fields} =  Create Dictionary   Type=Donation
    ...                                          Name=Auto Payment test $1000 Donation
    ...                                          Amount=5000     CloseDate=${opp_date}    StageName=Closed Won    npe01__Do_Not_Automatically_Create_Payment__c=true
    Setupdata                contact             contact_data=${contact1_fields}          opportunity_data=${opportunity_fields}    payment_data=${payment_fields}


    Go To Page                           Details
    ...                                  Opportunity
    ...                                  object_id=${data}[contact_opportunity][Id]

    # Navigate to the Account page and verify the new rollupfield is appearing and is showing the right amouunt
    Go To Page                           Details                                 Account                                object_id=${data}[contact][AccountId]

    Wait Until Loading Is Complete
    Select Tab                                            Details
    Navigate To And Validate Field Value                  This Year Payments on Past Year Pledges                contains         $1,667