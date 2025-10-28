export function getTimeFromString(value: string) {
  const currentDate = new Date();

  // Extract the hour and minute from the time string
  const timeString = value;
  const timeComponents = timeString.split(":");
  let hour = parseInt(timeComponents[0], 10);
  let minute = parseInt(timeComponents[1].split(" ")[0], 10);

  // Adjust the hour value for AM/PM
  if (timeString.indexOf("PM") !== -1 && hour < 12) {
    hour += 12;
  } else if (timeString.indexOf("AM") !== -1 && hour === 12) {
    hour = 0;
  }

  // Set the hour and minute to the current date
  currentDate.setHours(hour, minute, 0);
  return currentDate.getTime();
}

export function getTimeFromStringDate(value: string, date:any) {
  const currentDate = new Date(date);

  // Extract the hour and minute from the time string
  const timeString = value;
  const timeComponents = timeString.split(":");
  let hour = parseInt(timeComponents[0], 10);
  let minute = parseInt(timeComponents[1].split(" ")[0], 10);

  // Adjust the hour value for AM/PM
  if (timeString.indexOf("PM") !== -1 && hour < 12) {
    hour += 12;
  } else if (timeString.indexOf("AM") !== -1 && hour === 12) {
    hour = 0;
  }

  // Set the hour and minute to the current date
  currentDate.setHours(hour, minute, 0);
  return currentDate.getTime();
}

export function generateYearList(start: number) {
  const array = [];
  const lastyear = new Date(new Date().setFullYear(1950)).getFullYear();
  for (let i = start; i >= lastyear; i--) {
    array.push({
      name: i,
      _id: String(i),
    });
  }
  return array;
}

export function generatTimiListing(
  startTime: number,
  endTime: number,
  interval: number
) {
  let timeList = [];
  for (let i = startTime; i <= endTime; i += interval) {
    timeList.push({
      name: new Date(i),
      _id: new Date(i),
    });
  }
  return timeList;
}

export function nameInitial(name: string) {
  const splitArray = name.split(" ");
  let nameInitial = "";
  for (let i = 0; i < splitArray.length; i++) {
    if (i >= 2) {
      break;
    }
    nameInitial += splitArray[i].substring(0, 1);
  }
  return nameInitial;
}

export function getCurrentOrNextYear(date: any) {
  const dateArray = date.split(" ");
  const today = new Date();
  const dayOfMonth = today.getDate();
  const month = today.getMonth();

  // If it's December and the day is 12th or later, use the next year
  const currentYear =
    month === 11 && dateArray[2] == "Jan"
      ? today.getFullYear() + 1
      : today.getFullYear();

  return currentYear;
}
