import { describe, expect, it } from 'vitest';
import { normalizeSourcePayload } from './source-adapters';
import { parseGroupFitnessSchedule } from './group-fitness-source';

const GROUP_FITNESS_HTML = `
  <div class="node--type-page">
    <div class="node__content">
      <h2>Summer 2026 | May 1 – Aug 20</h2>
      <div class="component-standard-content">
        <h3>Things You Need to Know</h3>
        <ul><li>No classes on Aug 3.</li></ul>
      </div>
      <h3><a id="Day Sked"></a>Schedule by the Day</h3>
      <div class="component-standard-content">
        <h4>Monday</h4>
        <table>
          <tr><th>Class</th><th>Time</th><th>Location</th><th>Instructor</th></tr>
          <tr><td>Yoga Flow</td><td>7:00 AM</td><td>Studio A</td><td>J. Smith</td></tr>
        </table>
      </div>
      <div class="component-standard-content">
        <h4>Yoga Flow</h4>
        <table>
          <tr><th>Day</th><th>Time</th><th>Location</th><th>Instructor</th></tr>
          <tr><td>Monday</td><td>7:00 AM</td><td>Studio A</td><td>J. Smith</td></tr>
        </table>
      </div>
    </div>
  </div>
`;

describe('UNBC group fitness source adapter', () => {
  it('parses schedule sections in the source layer', () => {
    const schedule = parseGroupFitnessSchedule(GROUP_FITNESS_HTML);

    expect(schedule).toMatchObject({
      semesterLabel: 'Summer 2026',
      semesterDates: 'May 1 – Aug 20',
      closureNote: 'No classes on Aug 3.',
      byDay: [{
        title: 'Monday',
        rows: [{
          className: 'Yoga Flow',
          time: '7:00 AM',
          location: 'Studio A',
          instructor: 'J. Smith',
        }],
      }],
      byClass: [{
        title: 'Yoga Flow',
      }],
    });
  });

  it('exposes flattened normalized items to the Sources preview', () => {
    const normalized = normalizeSourcePayload({
      presetId: 'unbc-group-fitness',
      url: 'https://www.unbc.ca/northern-sport-centre/group-fitness',
      rawText: GROUP_FITNESS_HTML,
    });

    expect(normalized?.adapterId).toBe('unbc-group-fitness');
    expect(normalized?.items).toEqual([expect.objectContaining({
      title: 'Yoga Flow',
      subtitle: 'Monday · 7:00 AM',
      description: 'Studio A · J. Smith',
    })]);
  });
});
