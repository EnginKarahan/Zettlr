/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Table commands (tables)
 * CVM-Role:        Utility Functions
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file exposes a series of CodeMirror commands that make
 *                  working with tables easier and allow for keyboard-based
 *                  manipulation of them.
 *
 * END HEADER
 */

import { EditorView } from "@codemirror/view"

export function setAlignmentLeft (target: EditorView): boolean {
  return false
}

export function setAlignmentCenter (target: EditorView): boolean {
  return false
}

export function setAlignmentRight (target: EditorView): boolean {
  return false
}


export function clearTable (target: EditorView): boolean {
  return false
}

// Utility/Helper function that adds appropriate spacing
export function alignTable (/* TODO: Parameters */): void {
}
