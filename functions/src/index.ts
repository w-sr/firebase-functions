import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
const tools = require('firebase-tools');

admin.initializeApp(functions.config().firebase);

const db = admin.firestore();

const familyID = "K9ibRCmAcBtTZZUuXDFh";

const calendarID = "wbTbzJQKKrvwxOGEryQf";

const groceryListID = 'kWP5biCCIhwDITHYfG8L';

const projectID = "XXX-XXXX";

exports.dialogflowFirebaseFulfillment = functions.https.onRequest((request, response) => {

  const intent = request.body.queryResult.intent;

  // Parameters
  const parameters = request.body.queryResult.parameters;

  if (intent.displayName === "Create_Calendar_Event") {
    createEvent();
  } else if (intent.displayName === "Read_Calendar_Events") {
    getEvents();
  } else if (intent.displayName === "Find_Event") {
    findEvents();
  } else if (intent.displayName === "Create_Grocery_List_Item") {
    createGroceryListItem();
  } else if (intent.displayName === "Delete_Grocery_List_Item") {
    deleteGroceryListItem();
  } else if (intent.displayName === "Read_Grocery_List") {
    groceryListItems();
  } else if (intent.displayName === "Create_To_Do_List") {
    createToDoList();
  } else if (intent.displayName === "Delete_To_Do_List") {
    deleteToDoList();
  } else if (intent.displayName === "Read_To_Do_List") {
    getToDoListItems();
  } else if (intent.displayName === "Create_To_Do_List_Item") {
    createToDoListItem();
  } else if (intent.displayName === "Delete_To_Do_List_Item") {
    deleteToDoListItem();
  } else if (intent.displayName === "Create_Checklist") {
    createCheckList();
  } else if (intent.displayName === "Delete_Checklist") {
    deleteCheckList();
  } else if (intent.displayName === "Read_Checklist") {
    getCheckListItems();
  } else if (intent.displayName === "Create_Checklist_Item") {
    createCheckListItem();
  } else if (intent.displayName === "Delete_Checklist_Item") {
    deleteCheckListItem();
  }

  function checkTime(i: any) {
    if (i < 10) {
      // tslint:disable-next-line: no-parameter-reassignment
      i = "0" + i;
    }

    return i;
  }

  function formatTime(date: any) {
    const today = new Date(date);

    const h = today.getHours();
    let m = today.getMinutes();
    let s = today.getSeconds();

    m = checkTime(m);
    s = checkTime(s);

    return [h, m, s].join(':');
  }

  function formatDate(date: any) {
    let d = new Date(date), month = '' + (d.getMonth() + 1), day = '' + d.getDate(), year = d.getFullYear();

    if (month.length < 2)
      month = '0' + month;
    if (day.length < 2)
      day = '0' + day;

    return [year, month, day].join('-');
  }

  function getTimeZone(date: any) {
    if (date.indexOf("+") === -1) {
      const list = date.split('-');

      return -1 * parseInt(list[3].split(':')[0]);
    } else {
      const list = date.split('+');

      return parseInt(list[1].split(':')[0]);
    }
  }

  function formatDateTime(date: any, timezone: any) {
    let d = new Date(date), month = '' + (d.getMonth() + 1), day = '' + d.getDate(), year = d.getFullYear(), h = d.getHours(), m = d.getMinutes(), s = d.getSeconds();

    if (month.length < 2)
      month = '0' + month;
    if (day.length < 2)
      day = '0' + day;

    m = checkTime(m);
    s = checkTime(s);

    let label = '';
    let time = '';

    if (Math.abs(timezone) < 10) {
      time = '0' + Math.abs(timezone);
    } else {
      time = Math.abs(timezone).toString();
    }

    if (timezone >= 0) {
      label = '+';
    } else {
      label = '-';
    }

    return [year, month, day].join('-') + 'T' + [h, m, s].join(':') + label + time + ':00';
  }

  function plusTwoDates(startDate: any, duration: any) {
    const date = startDate;

    if (duration.unit === 'h') {
      date.setHours(date.getHours() + parseInt(duration.amount));
    } else if (duration.unit === 'min') {
      date.setMinutes(date.getMinutes() + parseInt(duration.amount));
    }

    return date;
  }

  function createEvent() {
    const eventName = parameters.eventName;

    if (!eventName) {
      sendResponse("What is the name of your event?");
    }

    if (!parameters.eventStartDate) {
      sendResponse("On what day is your event?");
    }

    const time = formatTime(parameters.eventStartTime);
    const timezone = getTimeZone(parameters.eventStartDate);
    let tmpDate = new Date(formatDate(parameters.eventStartDate) + ' ' + time);
    tmpDate.setMinutes(tmpDate.getMinutes() + timezone * 60);
    const eventDuration = parameters.eventDuration;
    let eventStart = new Date(tmpDate);
    const eventEnd = plusTwoDates(tmpDate, eventDuration);

    db.collection("Family").doc(familyID).collection("Calendar").doc(calendarID).collection("Event").add({
      eventName: eventName,
      eventMembers: parameters.eventMembers ? parameters.eventMembers : '',
      eventStart: formatDateTime(eventStart, timezone),
      eventEnd: formatDateTime(eventEnd, timezone),
      timeZone: parameters.timeZone ? parameters.timeZone : '',
    })
      .then(event => {
        sendResponse("Got it! I've added " + eventName + " to the family calendar for " + parameters.eventStartDate + " at " + parameters.eventStartTime);
      })
      .catch(error => {
        sendResponse("Create Event failed.");
      });
  }

  function getEvents() {
    const eventStartDate = parameters.eventStartDate;
    const timezone = getTimeZone(parameters.eventStartDate);

    const eventStart = new Date(formatDate(parameters.eventStartDate) + ' 00:00:00');
    const eventEnd = new Date(formatDate(parameters.eventStartDate) + ' 23:59:59');

    if (!eventStartDate) {
      sendResponse("What day would you like to know about?");
    }

    db.collection("Family").doc(familyID).collection("Calendar")
      .get()
      .then(function (calendarList) {

        if (calendarList.empty) {
          sendResponse("We don't have any event on that day.");
        }

        const promises: any[] = []
        calendarList.forEach(calendar => {

          const promise = db.collection("Family").doc(familyID).collection("Calendar").doc(calendar.id).collection("Event")
            .where("eventStart", ">=", formatDateTime(eventStart, timezone)).get();

          promises.push(promise);
        })

        Promise.all(promises)
          .then(res => {

            let eventList = "Sure thing. Here's what's going on " + eventStartDate + ".\n";
            res.forEach(events => {
              events.forEach((event: any) => {

                if (event.data().eventEnd <= formatDateTime(eventEnd, timezone)) {
                  if (event.data().eventMembers.length >= 1) {
                    let members = '';

                    event.data().eventMembers.forEach(function (member: any) {
                      members += member + '';
                    });

                    eventList += event.data().eventName + ' at ' + event.data().eventStart + ' with ' + members;
                  } else {
                    eventList += event.data().eventName + ' at ' + event.data().eventStart + '.';
                  }
                }
              });
            });

            sendResponse(eventList);
          })
          .catch(err => {
            sendResponse("Can't get events on that day.");
          });
      })
      .catch(function (error) {
        sendResponse("Can't get events on that day.");
      });
  }

  function findEvents() {
    const eventName = parameters.eventName;

    if (!eventName) {
      sendResponse("Bad Request - Emtpy eventName");
    }

    db.collection("Family").doc(familyID).collection('Calendar')
      .get()
      .then(function (calendarList) {

        if (calendarList.empty) {
          sendResponse("Calendar not exist");
          return;
        }

        calendarList.forEach(function (calendar) {
          db.collection("Family").doc(familyID).collection("Calendar").doc(calendar.id).collection("Event").where('eventName', '==', eventName)
            .get()
            .then(function (eventList) {
              if (eventList.empty) {
                sendResponse('No Such Event!');
              } else {
                let str = "You bet. I found these events matching " + eventName + "\n";

                eventList.forEach(event => {
                  const date = new Date(event.data().eventStart);
                  str += event.data().eventName + " at " + date + '\n';
                })

                sendResponse(str);
              }
            })
            .catch(function (error) {
              sendResponse(error);
            });
        });
      })
      .catch(function (error) {
        sendResponse(error);
      })
  }

  function createGroceryListItem() {

    const itemName = parameters.itemName;

    if (!itemName) {
      sendResponse("Bad Request - Empty itemName");
    }

    db.collection("Family").doc(familyID).collection("GroceryList").doc(groceryListID).collection("GroceryListItem")
      .add({
        itemName: itemName,
      })
      .then(listItem => {
        sendResponse("Done! I've added " + itemName + " to your family grocery list.");
      })
      .catch(error => {
        sendResponse("Add failed.");
      })
  }

  function deleteGroceryListItem() {
    const itemName = parameters.itemName;

    if (!itemName) {
      sendResponse("Bad Request - Empty itemName");
    }

    db.collection("Family").doc(familyID).collection("GroceryList").doc(groceryListID).collection("GroceryListItem").where("itemName", "==", itemName)
      .get()
      .then(itemList => {

        if (itemList.empty) {
          sendResponse("No Such GroceryListItem");
        }

        itemList.forEach(item => {
          tools.firestore
            .delete(`Family/${familyID}/GroceryList/${groceryListID}/GroceryListItem/${item.id}`, {
              project: projectID,
              recursive: true,
              yes: true
            })
            .then(() => {
              sendResponse("I've removed " + itemName + " from the grocery list.");
            })
            .catch((error: any) => {
              sendResponse(error);
            });
        })
      })
      .catch((error) => {
        sendResponse(error);
      })
  }

  function groceryListItems() {
    db.collection("Family").doc(familyID).collection("GroceryList").doc(groceryListID).collection("GroceryListItem")
      .get()
      .then(function (itemList) {

        if (itemList.empty) {
          sendResponse("No Such GroceryList")
        }

        let list = "Sure thing. Here's what's on the grocery list:\n";
        itemList.forEach(item => {
          list += item.data().itemName + '\n';
        });

        sendResponse(list);
      })
      .catch(function (error) {
        sendResponse(error);
      })
  }

  function createToDoList() {
    const listName = parameters.listName;

    if (!listName) {
      sendResponse("Bad Request - Empty listName");
    }

    db.collection("Family").doc(familyID).collection("ToDoList").add({
      listName: listName,
      listPriority: parameters.listPriority ? parameters.listPriority : 0
    })
      .then(function (list) {
        sendResponse("I've added " + listName + " as a new to do list.");
      })
      .catch(function (error) {
        sendResponse("Add failed.");
      });
  }

  function deleteToDoList() {
    const listName = parameters.listName;

    if (!listName) {
      sendResponse("Bad Request - Empty listName");
    }

    db.collection("Family").doc(familyID).collection("ToDoList").where("listName", "==", listName)
      .get()
      .then(listArray => {

        if (listArray.empty) {
          sendResponse("Doesn't exist such name to do list.");
        }

        listArray.forEach(list => {
          tools.firestore
            .delete(`Family/${familyID}/ToDoList/${list.id}`, {
              project: projectID,
              recursive: true,
              yes: true
            })
            .then(() => {
              sendResponse("I've removed " + listName + " from your to do lists.");
            })
            .catch((error: any) => {
              sendResponse("Delete failed.");
            });
        })
      })
      .catch((error: any) => {
        sendResponse("Doesn't exist such name to do list.")
      })
  }

  function getToDoListItems() {
    const listName = parameters.listName;

    if (!listName) {
      sendResponse('Bad Request - Empty listName');
    }

    db.collection("Family").doc(familyID).collection("ToDoList").where("listName", "==", listName)
      .get()
      .then(function (lists) {

        if (lists.empty) {
          sendResponse("Doesn't exist such name to do list");
        }

        const promises: any[] = [];

        lists.forEach(function (list) {

          const matchedListID = list.id;

          const promise = db.collection("Family").doc(familyID).collection("ToDoList").doc(matchedListID).collection("ToDoListItem").get();
          promises.push(promise);
        });

        // tslint:disable-next-line: no-floating-promises
        Promise.all(promises)
          .then(res => {

            let itemList = "You bet. Here's what's on the " + listName + " to do list. \n Return the current to do list items.";
            res.forEach(items => {
              items.forEach((item: any) => {
                // tslint:disable-next-line: no-void-expression
                itemList += item.data().itemName + " assigned to " + item.data().itemOwner + " is due on " + item.data().itemDueDate + ".";
              });
            });

            sendResponse(itemList);
          })
          .catch(err => {
            sendResponse("Can't read from the such to do list.");
          });
      })
      .catch(function (error) {
        sendResponse("Can't read from the such to do list.");
      });
  }

  function createToDoListItem() {
    const listName = parameters.listName;

    if (!listName) {
      sendResponse("Bad Request - Empty listName");
    }

    const itemName = parameters.itemName;

    if (!itemName) {
      sendResponse("Bad Request - Empty itemName");
    }

    db.collection("Family").doc(familyID).collection("ToDoList").where("listName", "==", listName)
      .get()
      .then(function (lists) {

        if (lists.empty) {
          sendResponse("No Such ToDoList");
        }

        lists.forEach(function (list) {

          const matchedListID = list.id;

          db.collection("Family").doc(familyID).collection("ToDoList").doc(matchedListID).collection("ToDoListItem")
            .add({
              itemName: parameters.itemName,
              itemPriority: parameters.itemPriority ? parameters.itemPriority : 0,
            })
            .then(function (item) {
              sendResponse("Done! I've added " + itemName + " to the " + listName + " to do list.");
            })
            .catch(function (error) {
              sendResponse("Add failed.");
            })
        })
      })
      .catch(function (error) {
        sendResponse("No Such ToDoList.");
      });
  }

  function deleteToDoListItem() {
    const listName = parameters.listName;

    if (!listName) {
      sendResponse("Bad Request - Empty listName");
    }

    const itemName = parameters.itemName;

    if (!itemName) {
      sendResponse("Bad Request - Empty itemName");
    }

    db.collection("Family").doc(familyID).collection("ToDoList").where("listName", "==", listName)
      .get()
      .then(listArray => {

        if (listArray.empty) {
          sendResponse("No Such ToDoList");
        }

        listArray.forEach(list => {
          db.collection("Family").doc(familyID).collection("ToDoList").doc(list.id).collection("ToDoListItem").where("itemName", "==", itemName)
            .get()
            .then(itemList => {

              if (itemList.empty) {
                sendResponse("No Such ToDoListItem");
              }

              itemList.forEach(item => {
                tools.firestore
                  .delete(`Family/${familyID}/ToDoList/${list.id}/ToDoListItem/${item.id}`, {
                    project: projectID,
                    recursive: true,
                    yes: true
                  })
                  .then(() => {
                    sendResponse("I've removed " + itemName + " from the " + listName + " to do list.");
                  })
                  .catch((error: any) => {
                    sendResponse("Delete failed.");
                  });
              });
            })
            .catch(error => {
              sendResponse("Delete failed.");
            });
        })
      })
      .catch((error: any) => {
        sendResponse("Delete failed");
      })
  }

  function createCheckList() {
    const listName = parameters.listName;

    if (!listName) {
      sendResponse("Bad Request - Empty listName");
    }

    db.collection("Family").doc(familyID).collection("CheckList").add({
      listName: parameters.listName,
      listPriority: parameters.listPriority ? parameters.listPriority : 0
    })
      .then(function (list) {
        sendResponse("I've added " + listName + " as a new checklist.");
      })
      .catch(function (error) {
        sendResponse("Add failed.");
      });
  }

  function deleteCheckList() {
    const listName = parameters.listName;

    if (!listName) {
      sendResponse("Bad Request - Empty listName");
    }

    db.collection("Family").doc(familyID).collection("CheckList").where("listName", "==", listName)
      .get()
      .then(listArray => {

        if (listArray.empty) {
          sendResponse("No Such ToDoList");
        }

        listArray.forEach(list => {
          tools.firestore
            .delete(`Family/${familyID}/CheckList/${list.id}`, {
              project: projectID,
              recursive: true,
              yes: true
            })
            .then(() => {
              sendResponse("I've removed " + listName + " from your checklists.")
            })
            .catch((error: any) => {
              sendResponse("Remove failed.");
            });
        })
      })
      .catch((error: any) => {
        sendResponse("Remove failed.");
      })
  }

  function getCheckListItems() {
    const listName = parameters.listName;

    if (!listName) {
      sendResponse("Bad Request - Empty listName");
    }

    db.collection("Family").doc(familyID).collection("CheckList").where("listName", "==", listName)
      .get()
      .then(function (lists) {

        if (lists.empty) {
          sendResponse("No Such CheckList");
        }

        const promises: any[] = [];

        lists.forEach(function (list) {

          const matchedListID = list.id;

          const promise = db.collection("Family").doc(familyID).collection("CheckList").doc(matchedListID).collection("CheckListItem").get();
          promises.push(promise);
        });

        // tslint:disable-next-line: no-floating-promises
        Promise.all(promises)
          .then(res => {

            let list = "Sure. Here's what's on the " + listName + " checklist:\n Return the current checklist items\n";
            res.forEach(items => {
              items.forEach((item: any) => {
                // tslint:disable-next-line: no-void-expression
                list += item.data().itemName + ",\n";
              });
            });

            sendResponse(list);
          })
          .catch(err => {
            sendResponse("Can't read such checklist items");
          });
      })
      .catch(function (error) {
        sendResponse("Can't read such checklist items");
      });
  }

  function createCheckListItem() {
    const listName = parameters.listName;

    if (!listName) {
      sendResponse("Bad Request - Empty listName");
    }

    const itemName = parameters.itemName;

    if (!itemName) {
      sendResponse("Bad Request - Empty itemName");
    }

    db.collection("Family").doc(familyID).collection("CheckList").where("listName", "==", listName)
      .get()
      .then((lists) => {

        if (lists.empty) {
          sendResponse("No Such CheckList")
        }

        lists.forEach(function (list) {

          const matchedListID = list.id;

          db.collection("Family").doc(familyID).collection("CheckList").doc(matchedListID).collection("CheckListItem")
            .add({
              itemName: parameters.itemName,
              itemPriority: parameters.itemPriority ? parameters.itemPriority : 0,
            })
            .then(function (item) {
              sendResponse("You bet! I've added " + itemName + " to the " + listName + " checklist.");
            })
            .catch(function (error) {
              sendResponse("Add failed.")
            })
        })
      })
      .catch(function (error) {
        sendResponse("Add failed.")
      });
  }

  function deleteCheckListItem() {
    const listName = parameters.listName;

    if (!listName) {
      sendResponse("Bad Request - Empty listName");
    }

    const itemName = parameters.itemName;

    if (!itemName) {
      sendResponse("Bad Request - Empty itemName");
    }

    db.collection("Family").doc(familyID).collection("CheckList").where("listName", "==", listName)
      .get()
      .then(listArray => {

        if (listArray.empty) {
          sendResponse("No Such CheckList");
        }

        listArray.forEach(list => {
          db.collection("Family").doc(familyID).collection("CheckList").doc(list.id).collection("CheckListItem").where("itemName", "==", itemName)
            .get()
            .then(itemList => {

              if (itemList.empty) {
                sendResponse("No Such CheckListItem");
              }

              itemList.forEach(item => {
                tools.firestore
                  .delete(`Family/${familyID}/CheckList/${list.id}/CheckListItem/${item.id}`, {
                    project: projectID,
                    recursive: true,
                    yes: true
                  })
                  .then(() => {
                    sendResponse("I've removed " + itemName + " from the " + listName + " checklist.");
                  })
                  .catch((error: any) => {
                    sendResponse("Remove failed.");
                  });
              });
            })
            .catch(error => {
              sendResponse("Remove Failed.")
            });
        })
      })
      .catch((error: any) => {
        sendResponse("Remove Failed.")
      })
  }

  // Function to send correctly formatted responses to Dialogflow which are then sent to the user
  function sendResponse(responseToUser: any) {
    const responseJson = {
      fulfillmentText: responseToUser
    };

    response.json(responseJson);
  }
});