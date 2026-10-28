import { Kbd } from '../../components/ui';
import { KEY_LAYOUT } from '../input/keyboard';
import { isTouch } from './FightView';

/** How to play: the keyboard layout on computers, the touch layout on phones. */
export function ControlsHelp() {
  return (
    <div className="text-sm">
      {isTouch ? (
        <ul className="space-y-1.5">
          <li>
            <strong className="font-display uppercase tracking-wide">Left thumb</strong>: the joystick moves and aims (it appears where you touch).
          </li>
          <li>
            <strong className="font-display uppercase tracking-wide">Right thumb</strong>: Attack, Special, Jump, Dodge.
          </li>
          <li>Hold a direction while pressing Attack or Special for the up, down and side moves.</li>
          <li>Play with the phone turned sideways.</li>
        </ul>
      ) : (
        <table className="w-full">
          <tbody>
            {KEY_LAYOUT.map((row) => (
              <tr key={row.action} className="border-b border-line last:border-0">
                <td className="py-1.5 pr-3 font-display uppercase tracking-wide">{row.action}</td>
                <td className="py-1.5">
                  <span className="flex flex-wrap gap-1">
                    {row.keys.map((k) => (
                      <Kbd key={k}>{k}</Kbd>
                    ))}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="mt-3 text-muted">
        Attacks change with the direction you hold: up, down, side, or none. Tap down in the air to fall faster; hold down on a platform to drop through.
      </p>
    </div>
  );
}
