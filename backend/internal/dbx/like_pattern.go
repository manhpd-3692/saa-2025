package dbx

import "strings"

// likeEscaper escapes the LIKE wildcards and the default escape character, so
// user text matches literally (Postgres default ESCAPE '\').
var likeEscaper = strings.NewReplacer(`\`, `\\`, `%`, `\%`, `_`, `\_`)

// ContainsPattern is a LIKE/ILIKE pattern matching s anywhere ("%" when s is empty).
func ContainsPattern(s string) string { return "%" + likeEscaper.Replace(s) + "%" }

// PrefixPattern is a LIKE pattern matching values starting with s ("%" when s is empty).
func PrefixPattern(s string) string { return likeEscaper.Replace(s) + "%" }
