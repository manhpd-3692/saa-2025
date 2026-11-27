package upload

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"
)

// CreateSignedUploadURL asks Storage for a signed upload URL without upsert,
// so the key is write-once and an existing object can never be replaced (R03).
func (s *StorageObjectStore) CreateSignedUploadURL(ctx context.Context, objectPath string) (SignedUpload, error) {
	name, err := objectName(objectPath)
	if err != nil {
		return SignedUpload{}, err
	}
	var out struct {
		URL   string `json:"url"`
		Token string `json:"token"`
	}
	headers := http.Header{"X-Upsert": {"false"}}
	if err := s.doJSON(ctx, http.MethodPost, "/object/upload/sign/"+Bucket+"/"+url.PathEscape(name), headers, struct{}{}, &out); err != nil {
		return SignedUpload{}, fmt.Errorf("sign upload %s: %w", objectPath, err)
	}
	if out.URL == "" || out.Token == "" {
		return SignedUpload{}, fmt.Errorf("sign upload %s: storage returned no URL", objectPath)
	}
	return SignedUpload{URL: s.baseURL + out.URL, Token: out.Token}, nil
}

// ObjectInfo reads the stored object's real size and content type.
func (s *StorageObjectStore) ObjectInfo(ctx context.Context, objectPath string) (ObjectInfo, error) {
	name, err := objectName(objectPath)
	if err != nil {
		return ObjectInfo{}, err
	}
	var out struct {
		Size        *int64 `json:"size"`
		ContentType string `json:"content_type"`
		Metadata    struct {
			Size     *int64 `json:"size"`
			MimeType string `json:"mimetype"`
		} `json:"metadata"`
	}
	if err := s.doJSON(ctx, http.MethodGet, "/object/info/authenticated/"+Bucket+"/"+url.PathEscape(name), nil, nil, &out); err != nil {
		return ObjectInfo{}, fmt.Errorf("object info %s: %w", objectPath, err)
	}
	info := ObjectInfo{ContentType: out.ContentType}
	switch {
	case out.Size != nil:
		info.Size = *out.Size
	case out.Metadata.Size != nil:
		info.Size = *out.Metadata.Size
	default:
		return ObjectInfo{}, fmt.Errorf("object info %s: storage returned no size", objectPath)
	}
	if info.ContentType == "" {
		info.ContentType = out.Metadata.MimeType
	}
	return info, nil
}

// ReadPrefix reads at most n bytes from the start of the stored object.
func (s *StorageObjectStore) ReadPrefix(ctx context.Context, objectPath string, n int) ([]byte, error) {
	name, err := objectName(objectPath)
	if err != nil {
		return nil, err
	}
	headers := http.Header{"Range": {fmt.Sprintf("bytes=0-%d", n-1)}}
	resp, err := s.do(ctx, http.MethodGet, "/object/authenticated/"+Bucket+"/"+url.PathEscape(name), headers, nil)
	if err != nil {
		return nil, fmt.Errorf("read %s: %w", objectPath, err)
	}
	defer resp.Body.Close()
	head, err := io.ReadAll(io.LimitReader(resp.Body, int64(n)))
	if err != nil {
		return nil, fmt.Errorf("read %s: %w", objectPath, err)
	}
	return head, nil
}

// SignReadURLs signs every path in one Storage call (F006 INT-001).
func (s *StorageObjectStore) SignReadURLs(ctx context.Context, objectPaths []string, ttl time.Duration) (map[string]string, error) {
	signed := make(map[string]string, len(objectPaths))
	if len(objectPaths) == 0 {
		return signed, nil
	}
	names := make([]string, 0, len(objectPaths))
	pathByName := make(map[string]string, len(objectPaths))
	for _, p := range objectPaths {
		name, err := objectName(p)
		if err != nil {
			return nil, err
		}
		names = append(names, name)
		pathByName[name] = p
	}
	body := map[string]any{"expiresIn": int(ttl.Seconds()), "paths": names}
	var out []struct {
		Path      string  `json:"path"`
		SignedURL *string `json:"signedURL"`
	}
	if err := s.doJSON(ctx, http.MethodPost, "/object/sign/"+Bucket, nil, body, &out); err != nil {
		return nil, fmt.Errorf("sign read URLs: %w", err)
	}
	for _, item := range out {
		if p, ok := pathByName[item.Path]; ok && item.SignedURL != nil && *item.SignedURL != "" {
			signed[p] = s.baseURL + *item.SignedURL
		}
	}
	return signed, nil
}

// doJSON sends an optional JSON body and decodes a 2xx JSON answer into out.
func (s *StorageObjectStore) doJSON(ctx context.Context, method, path string, headers http.Header, in, out any) error {
	var body io.Reader
	if in != nil {
		raw, err := json.Marshal(in)
		if err != nil {
			return fmt.Errorf("encode request: %w", err)
		}
		body = bytes.NewReader(raw)
		if headers == nil {
			headers = http.Header{}
		}
		headers.Set("Content-Type", "application/json")
	}
	resp, err := s.do(ctx, method, path, headers, body)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if err := json.NewDecoder(resp.Body).Decode(out); err != nil {
		return fmt.Errorf("decode storage response: %w", err)
	}
	return nil
}

// do sends one authenticated request and turns every non-2xx answer into an
// error; Storage reports a missing object as 404 or as 400 with statusCode "404".
func (s *StorageObjectStore) do(ctx context.Context, method, path string, headers http.Header, body io.Reader) (*http.Response, error) {
	req, err := http.NewRequestWithContext(ctx, method, s.baseURL+path, body)
	if err != nil {
		return nil, fmt.Errorf("build storage request: %w", err)
	}
	for key, values := range headers {
		req.Header[key] = values
	}
	req.Header.Set("apikey", s.serviceKey)
	req.Header.Set("Authorization", "Bearer "+s.serviceKey)
	resp, err := s.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("storage request: %w", err)
	}
	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		return resp, nil
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(io.LimitReader(resp.Body, 1024))
	var envelope struct {
		StatusCode string `json:"statusCode"`
	}
	_ = json.Unmarshal(raw, &envelope)
	if resp.StatusCode == http.StatusNotFound || envelope.StatusCode == "404" {
		return nil, ErrObjectNotFound
	}
	return nil, fmt.Errorf("storage answered %d: %s", resp.StatusCode, bytes.TrimSpace(raw))
}
