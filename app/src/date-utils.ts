import moment, { Moment } from 'moment-timezone';

// Init locale for moment
moment.locale(navigator.language);

// Initialise moment timezone
const tz = moment.tz.guess();
if (!tz) {
  console.error('DateUtils: TimeZone could not be determined. This should not happen!');
}

const yearRegex = / ?YY(YY)?/;

const Hours = {
  Morning: 9,
  Evening: 20,
  Midnight: 24,
};

const Days = {
  // The value for next monday and next weekend varies depending if the current
  // day is saturday or sunday. See http://momentjs.com/docs/#/get-set/day/
  NextMonday: day => (day === 0 ? 1 : 8),
  ThisWeekend: day => (day === 6 ? 13 : 6),
};

function oclock(momentDate) {
  return momentDate.minute(0).second(0);
}

function morning(momentDate, morningHour = Hours.Morning) {
  return oclock(momentDate.hour(morningHour));
}

function evening(momentDate, eveningHour = Hours.Evening) {
  return oclock(momentDate.hour(eveningHour));
}

function midnight(momentDate, midnightHour = Hours.Midnight) {
  return oclock(momentDate.hour(midnightHour));
}

function isPastDate(inputDateObj, currentDate) {
  const inputMoment = moment({ ...inputDateObj, month: inputDateObj.month - 1 });
  const currentMoment = moment(currentDate);

  return inputMoment.isBefore(currentMoment);
}

let _chronoPast = null;
let _chronoFuture = null;
let _chrono = null;

function getChrono() {
  if (!_chrono) {
    _chrono = require('chrono-node'); //eslint-disable-line
  }
  return _chrono;
}

function getChronoFuture() {
  if (_chronoFuture) {
    return _chronoFuture;
  }

  const chrono = getChrono();
  const EnforceFutureDate = new chrono.Refiner();
  EnforceFutureDate.refine = (text, results) => {
    results.forEach(result => {
      const current = Object.assign({}, result.start.knownValues, result.start.impliedValues);

      if (result.start.isCertain('weekday') && !result.start.isCertain('day')) {
        if (isPastDate(current, result.ref)) {
          result.start.imply('day', result.start.impliedValues.day + 7);
        }
      }

      if (result.start.isCertain('day') && !result.start.isCertain('month')) {
        if (isPastDate(current, result.ref)) {
          result.start.imply('month', result.start.impliedValues.month + 1);
        }
      }
      if (result.start.isCertain('month') && !result.start.isCertain('year')) {
        if (isPastDate(current, result.ref)) {
          result.start.imply('year', result.start.impliedValues.year + 1);
        }
      }
    });
    return results;
  };

  _chronoFuture = new chrono.Chrono(chrono.options.casualOption());
  _chronoFuture.refiners.push(EnforceFutureDate);
  return _chronoFuture;
}

function getChronoPast() {
  if (_chronoPast) {
    return _chronoPast;
  }

  const chrono = getChrono();
  const EnforcePastDate = new chrono.Refiner();
  EnforcePastDate.refine = (text, results) => {
    results.forEach(result => {
      const current = Object.assign({}, result.start.knownValues, result.start.impliedValues);

      if (result.start.isCertain('weekday') && !result.start.isCertain('day')) {
        if (!isPastDate(current, result.ref)) {
          result.start.imply('day', result.start.impliedValues.day - 7);
        }
      }

      if (result.start.isCertain('day') && !result.start.isCertain('month')) {
        if (!isPastDate(current, result.ref)) {
          result.start.imply('month', result.start.impliedValues.month - 1);
        }
      }
      if (result.start.isCertain('month') && !result.start.isCertain('year')) {
        if (!isPastDate(current, result.ref)) {
          result.start.imply('year', result.start.impliedValues.year - 1);
        }
      }
    });
    return results;
  };

  _chronoPast = new chrono.Chrono(chrono.options.casualOption());
  _chronoPast.refiners.push(EnforcePastDate);
  return _chronoPast;
}

function expandDateLikeString(dateLikeString: string) {
  // Short format: 123 => 1:23 or 1234 => 12:34
  if (/^\d{3,4}$/.test(dateLikeString)) {
    const len = dateLikeString.length;
    dateLikeString = dateLikeString.slice(0, len - 2) + ':' + dateLikeString.slice(len - 2); // Insert colon
  }

  // Short format: 2h
  if (/^\d+h$/.test(dateLikeString)) {
    const numHours = dateLikeString.match(/^\d+/)[0]; // Extract number
    return `${numHours} hours`;
  }

  // Short format: 2d
  if (/^\d+d$/.test(dateLikeString)) {
    const numDays = dateLikeString.match(/^\d+/)[0]; // Extract number
    return `${numDays} days`;
  }

  // Short format: 2w
  if (/^\d+w$/.test(dateLikeString)) {
    const numWeeks = dateLikeString.match(/^\d+/)[0]; // Extract number
    return `${numWeeks} weeks`;
  }

  // Short format: 2m, 2mo
  if (/^\d+mo?$/.test(dateLikeString)) {
    const numMonths = dateLikeString.match(/^\d+/)[0]; // Extract number
    return `${numMonths} months`;
  }

  // Short format: t, to, tom => tomorrow
  if (['t', 'to', 'tom', 'tom '].indexOf(dateLikeString) >= 0) {
    return `tomorrow morning`;
  }

  // Short format: nw, next week => next week
  if (['nw', 'next week'].indexOf(dateLikeString) >= 0) {
    return `next Monday`;
  }

  if (dateLikeString.indexOf('tom ') === 0) {
    return dateLikeString.replace('tom ', 'tomorrow ');
  }

  return dateLikeString; // Return original string if no match
}

const DateUtils = {
  // Localized format: ddd, MMM D, YYYY h:mmA
  DATE_FORMAT_LONG: 'llll',

  DATE_FORMAT_LONG_NO_YEAR: moment
    .localeData()
    .longDateFormat('llll')
    .replace(yearRegex, ''),

  // Localized format: MMM D, h:mmA
  DATE_FORMAT_SHORT: moment
    .localeData()
    .longDateFormat('lll')
    .replace(yearRegex, ''),

  DATE_FORMAT_llll_NO_TIME: moment
    .localeData()
    .longDateFormat('llll')
    .replace(/h:mm/, '')
    .replace(' A', ''),

  DATE_FORMAT_LLLL_NO_TIME: moment
    .localeData()
    .longDateFormat('LLLL')
    .replace(/h:mm/, '')
    .replace(' A', ''),

  timeZone: tz,

  format(momentDate, formatString?) {
    if (!momentDate) return null;
    return momentDate.format(formatString);
  },

  utc(momentDate) {
    if (!momentDate) return null;
    return momentDate.utc();
  },

  minutesFromNow(minutes, now = moment()) {
    return now.add(minutes, 'minutes');
  },

  hoursFromNow(hours, now = moment()) {
    return now.add(hours, 'hours');
  },

  in1Hour() {
    return DateUtils.minutesFromNow(60);
  },

  in2Hours() {
    return DateUtils.minutesFromNow(120);
  },

  laterToday(now = moment()) {
    return oclock(now.add(3, 'hours'));
  },

  tonight(now = moment()) {
    if (now.hour() >= Hours.Evening) {
      return midnight(now);
    }
    return evening(now);
  },

  tomorrow(now = moment()) {
    return morning(now.add(1, 'day'));
  },

  tomorrowEvening(now = moment()) {
    return evening(now.add(1, 'day'));
  },

  thisWeekend(now = moment()) {
    return morning(now.day(Days.ThisWeekend(now.day())));
  },

  weeksFromNow(weeks, now = moment()) {
    return now.add(weeks, 'weeks');
  },

  nextWeek(now = moment()) {
    return morning(now.day(Days.NextMonday(now.day())));
  },

  monthsFromNow(months, now = moment()) {
    return now.add(months, 'months');
  },

  nextMonth(now = moment()) {
    return morning(now.add(1, 'month').date(1));
  },

  getChronoPast,

  parseDateString(
    dateLikeString: string
  ): {
    leftoverText: string;
    start: Moment;
    end: Moment;
  } {
    const parsed = getChrono().parse(dateLikeString);
    const gotTime = { start: false, end: false };
    const gotDay = { start: false, end: false };
    const now = moment();
    const results = { start: moment(now), end: moment(now), leftoverText: dateLikeString };
    for (const item of parsed) {
      for (const val of ['start', 'end']) {
        if (!(val in item)) {
          continue;
        }
        const { day: knownDay, weekday: knownWeekday, hour: knownHour } = item[val].knownValues;
        const { year, month, day, hour, minute } = Object.assign(
          item[val].knownValues,
          item[val].impliedValues
        );
        if (!gotTime[val] && knownHour) {
          gotTime[val] = true;
          results[val].minute(minute);
          results[val].hour(hour);

          if (!gotDay[val]) {
            results[val].date(day);
            results[val].month(month - 1); // moment zero-indexes month
            results[val].year(year);
          }

          results.leftoverText = results.leftoverText.replace(item.text, '');
        }
        if (!gotDay[val] && (knownDay || knownWeekday)) {
          gotDay[val] = true;
          results[val].year(year);
          results[val].month(month - 1); // moment zero-indexes month
          results[val].date(day);

          if (!gotTime[val]) {
            results[val].hour(hour);
            results[val].minute(minute);
          }

          results.leftoverText = results.leftoverText.replace(item.text, '');
        }
      }
    }

    // Make the event a default 1 hour long if it looks like the end date
    // wasn't assigned, or if it's before the start date.
    if (results.end.valueOf() === now.valueOf() || results.end <= results.start) {
      results.end = moment(results.start);
      results.end.hour(results.end.hour() + 1);
    }

    return results;
  },

  /**
   * Can take almost any string.
   * e.g. "Next Monday at 2pm"
   * @param {string} dateLikeString - a string representing a date.
   * @return {moment} - moment object representing date
   */
  futureDateFromString(dateLikeString) {
    const expanded = expandDateLikeString(dateLikeString);
    const date = getChronoFuture().parseDate(expanded);
    if (!date) {
      return null;
    }
    const inThePast = date.valueOf() < Date.now();
    if (inThePast) {
      return null;
    }
    return moment(date);
  },

  /**
   * Return a formatting string for displaying time
   *
   * @param {Date} opts - Object with different properties for customising output
   * @return {String} The format string based on syntax used by Moment.js
   *
   * seconds, upperCase and timeZone are the supported extra options to the format string.
   * Checks whether or not to use 24 hour time format.
   */
  getTimeFormat(opts) {
    const use24HourClock = AppEnv.config.get('core.workspace.use24HourClock');
    let timeFormat = use24HourClock ? 'HH:mm' : 'h:mm';

    if (opts && opts.seconds) {
      timeFormat += ':ss';
    }

    // Append meridian if not using 24 hour clock
    if (!use24HourClock) {
      if (opts && opts.upperCase) {
        timeFormat += ' A';
      } else {
        timeFormat += ' a';
      }
    }

    if (opts && opts.timeZone) {
      timeFormat += ' z';
    }

    return timeFormat;
  },

  /**
   * Return a short format date/time
   *
   * @param {Date} datetime - Timestamp
   * @return {String} Formated date/time
   *
   * The returned date/time format depends on how long ago the timestamp is.
   */
  shortTimeString(datetime: Date) {
    const now = moment();
    const diff = now.diff(datetime, 'days', true);
    const isSameDay = now.isSame(datetime, 'days');
    const opts: Intl.DateTimeFormatOptions = {
      hourCycle: AppEnv.config.get('core.workspace.use24HourClock') ? 'h23' : 'h12',
    };

    if (diff <= 1 && isSameDay) {
      // Time if less than 1 day old
      opts.hour = 'numeric';
      opts.minute = '2-digit';
    } else if (diff < 5 && !isSameDay) {
      // Weekday with time if up to 2 days ago
      //opts.month = 'short';
      //opts.day = 'numeric';
      opts.weekday = 'short';
      opts.hour = 'numeric';
      opts.minute = '2-digit';
    } else {
      if (diff < 365) {
        // Month and day up to 1 year old
        opts.month = 'short';
        opts.day = 'numeric';
      } else {
        // Month, day and year if over a year old
        opts.year = 'numeric';
        opts.month = 'short';
        opts.day = 'numeric';
      }
      return datetime.toLocaleDateString(navigator.language, opts);
    }

    return datetime.toLocaleTimeString(navigator.language, opts);
  },

  /**
   * Return a medium format date/time
   *
   * @param {Date} datetime - Timestamp
   * @return {String} Formated date/time
   */
  mediumTimeString(datetime: Date) {
    return datetime.toLocaleTimeString(navigator.language, {
      hourCycle: AppEnv.config.get('core.workspace.use24HourClock') ? 'h23' : 'h12',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      second: undefined,
    });
  },

  /**
   * Return a long format date/time
   *
   * @param {Date} datetime - Timestamp
   * @return {String} Formated date/time
   */
  fullTimeString(datetime: Date) {
    // ISSUE: this does drop ordinal. There is this:
    // -> new Intl.PluralRules(LOCALE, { type: "ordinal" }).select(dateTime.getDay())
    // which may work with the below regex, though localisation is required
    // `(?<!\d)${dateTime.getDay()}(?!\d)` replace `$1${localise(ordinal)}`

    return datetime.toLocaleTimeString(navigator.language, {
      hourCycle: AppEnv.config.get('core.workspace.use24HourClock') ? 'h23' : 'h12',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
      second: undefined,
    });
  },
};

export default DateUtils;
