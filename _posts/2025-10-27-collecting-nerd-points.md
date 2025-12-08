---
title: Collecting Nerd Points by Migrating from Google Photos to Nextcloud & Memories
tags: nextcloud homelab linux
---

I recently set up a local Nextcloud instance (yes, there are encrypted off-site backups) to maintain and share some stuff. Now I want to see how well the [Memories](https://apps.nextcloud.com/apps/memories) app can replace Google Photos.[^1]


## Step 1: Exporting from Google

[Google's Takeout](https://takeout.google.com/) makes it easy to export what you need. It can take a few days though: requesting about 200 GB of images and videos took four days for the download links to be ready. Google also doesn't provide a way to easily obtain and import the download links into a download manager. Or any other way to more easily manage the process of downloading potentially tens or hundreds of archives.

>[!WARNING]
>Be aware of where you store the data! Directly storing and cleaning it within Nextcloud's data dir will put a strain on Nextcloud's indexing and potentially blow up backup size.
>
>Either stop Nextcloud or do the data wrangling somewhere else.

But wait - there are more quirks once all archives are extracted!

Pictures are sorted into folders per year and custom albums are simply represented as folders with literal copies of the images.

```bash
ls --format single-column
'Photos from 2023'
'Photos from 2024'
'Photos from 2025'
'My Album'
'Another Album'
```
`cd`'ing into an album reveals that metadata is stored as JSON for each image and album.
```bash
ls --format single-column | tail -n 3
DSC_0944.JPG
DSC_0944.JPG.supplemental-metadata.json
metadata.json

cat DSC_0944.JPG.supplemental-metadata.json
{
  "title": "DSC_0944.JPG",
  "description": "",
  "imageViews": "14",
  "creationTime": {
    "timestamp": "1586306999",
    "formatted": "Apr 8, 2020, 12:49:59 AM UTC"
  },
  "photoTakenTime": {
    "timestamp": "1586308187",
    "formatted": "Apr 8, 2020, 1:09:47 AM UTC"
  },
  "geoData": {
    "latitude": 0.0,
    "longitude": 0.0,
    "altitude": 0.0,
    "latitudeSpan": 0.0,
    "longitudeSpan": 0.0
  },
...
```

## Step 2: Cleanup

If you don't care about custom albums, this step is easy: just delete all folders not following the "Photos from YYYY" pattern: 
```bash
find . -maxdepth 1 -type d ! -name 'Photos from [0-9][0-9][0-9][0-9]' ! -name . -exec rm -r {} \;
```

If you'd rather delete the duplicates in the yearly folders and keep your albums you can use [my script](https://gist.github.com/byted/308b61507e485af5b4a7a85d4a781506). It has a few more features that I'll talk about later.

We can skip the metadata cleanup here since Memories can take care of it - see below.

## Step 3: Importing into Nextcloud

Move the data into the correct Nextcloud user. Assuming Nextcloud's data directory is mounted at `/store-all-the-things` it should look something like:
```bash
rsync --progress -avz <your path> '/store-all-the-things/<username>/files/Photos/Google Photos'
```
Now make sure the permissions are set correctly:
```bash
chown -R www-data:www-data Google\ Photos/
```
Next, make the files known to Nextcloud via `occ files:scan`. If you're running Nextcloud AIO:
```bash
docker exec -u www-data -it nextcloud-aio-nextcloud php occ files:scan <username>
```
Lastly, as promised earlier, let Memories take care of migrating the metadata from Google's JSON into EXIF:
```bash
docker exec --user www-data -it nextcloud-aio-nextcloud php occ memories:migrate-google-takeout -u <username> -f /Photos/Google\ Photos
```

>[!WARNING]
>The scan and migrate commands can take a long time depending on the size of your data. Be sure to limit it to the user and/or paths in question. For me, working on 200 GB did not result in significant slowdowns though. See [occ documentation](https://docs.nextcloud.com/server/latest/admin_manual/configuration_files/occ_command.html) for details.


Done!

Now I'm going to test-drive this for a while until I finally commit and close my Google Photos account. It will happen someday, I swear!


Note: if files are not showing up in Memories, try:
```
docker exec -u www-data -it nextcloud-aio-nextcloud php occ memories:index -u <username>
```

---

[^1]: Why not [Immich](https://github.com/immich-app/immich)? Even though I really enjoy the name, I want to avoid hosting yet another tool and see how far I can get with Nextcloud.
