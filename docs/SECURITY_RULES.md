# Firestore Security Rules (Hardened for team members)

Use this ruleset to allow org owners and admins to manage team members without using the Firestore console, while keeping access scoped to each organization.

It relies on a small "membership mirror" document written at `organizations/{orgId}/members/{uid}` used only for authorization checks. This app writes it automatically on login for the org owner; role changes also mirror into this doc.

```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isSignedIn() {
      return request.auth != null;
    }
    function memberDoc(orgId) {
      return get(/databases/$(database)/documents/organizations/$(orgId)/members/$(request.auth.uid));
    }
    function isOrgMember(orgId) {
      return isSignedIn() &&
             exists(/databases/$(database)/documents/organizations/$(orgId)/members/$(request.auth.uid)) &&
             memberDoc(orgId).data.active == true;
    }
    function isOrgOwner(orgId) { return isOrgMember(orgId) && memberDoc(orgId).data.role == 'owner'; }
    function isOrgAdmin(orgId) { return isOrgMember(orgId) && (memberDoc(orgId).data.role == 'admin' || memberDoc(orgId).data.role == 'owner'); }

    // Global team members collection
    match /teamMembers/{id} {
      // Any signed-in user can read their own record OR members of the same org can read
      allow get, list, read: if isSignedIn() && (
        resource.data.userId == request.auth.uid ||
        (resource.data.email != null && request.auth.token.email != null && resource.data.email == request.auth.token.email) ||
        (resource.data.organizationId != null && isOrgMember(resource.data.organizationId))
      );

      // Create allowed for admins/owner of the target org
      // Allow org owner by UID even if membership mirror doesn't exist yet
      allow create: if isSignedIn() && request.resource.data.organizationId != null && (
        request.auth.uid == request.resource.data.organizationId ||
        isOrgAdmin(request.resource.data.organizationId)
      ) && (
        !(request.resource.data.role == 'owner') || isOrgOwner(request.resource.data.organizationId)
      );

      // Update allowed for admins/owner of the existing doc's org
      // Only the current owner can assign role "owner" in updates
      allow update: if isSignedIn() && resource.data.organizationId != null && (
        request.auth.uid == resource.data.organizationId ||
        isOrgAdmin(resource.data.organizationId)
      ) && (
        !(request.resource.data.role == 'owner') || isOrgOwner(resource.data.organizationId)
      );

      // Delete allowed for admins/owner of the existing doc's org, except the owner record cannot be deleted
      allow delete: if isSignedIn() && resource.data.organizationId != null && (
        request.auth.uid == resource.data.organizationId ||
        isOrgAdmin(resource.data.organizationId)
      ) && resource.data.role != 'owner';
    }

    // Org membership mirror used for authorization
    match /organizations/{orgId}/members/{uid} {
      // Allow reading own membership; admins can read any within org
      allow get, list, read: if isSignedIn() && (request.auth.uid == uid || isOrgAdmin(orgId) || request.auth.uid == orgId);

      // Owner (by UID) can always write their own membership doc
      // Existing admins can write other members' docs
      // Only owner can set role="owner"
      allow create, update: if isSignedIn() && (
        (request.auth.uid == orgId && request.auth.uid == uid) ||
        (isOrgAdmin(orgId) && !(request.resource.data.role == 'owner'))
      );
      
      // Only owner can delete membership docs (except owner's own doc)
      allow delete: if isSignedIn() && request.auth.uid == orgId && uid != orgId;
    }
  }
}
```

## Apply these rules

1. Open Firebase console → Firestore Database → Rules.
2. Replace rules with the snippet above and Publish.
3. Make sure the org owner signs in once; the app will write `organizations/{orgId}/members/{ownerUid}` automatically.
4. After that, admins (with membership docs) can add/edit members and promote/demote roles entirely in-app.

## Notes
- This keeps per-org data isolated. Members only see their org’s documents.
- The app mirrors role changes to the membership doc when a member’s role is edited.
- If you later add more org-scoped collections, reuse `isOrgMember/isOrgAdmin` for consistent access control.
