import {
  Component,
  OnInit,
  AfterViewInit,
  ViewChild,
  ElementRef,
  Renderer2,
} from '@angular/core';
import { FormBuilder, FormControl, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Conversation, UserAgent, Session, Stream } from '@apirtc/apirtc';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'app-video-section',
  templateUrl: './video-section.component.html',
  styleUrls: ['./video-section.component.css'],
})
export class VideoSectionComponent implements OnInit {
  public showFiller = false;
  public recordingBtnState = false;
  public recordedUrl: any;
  public localStream: any;
  public muteVideo = false;
  public muteAudio = false;
  public numberOfPerticipant: any;

  constructor(
    private fb: FormBuilder,
    public router: Router,
    private _snackBar: MatSnackBar,
    public dialog: MatDialog,
    private renderer: Renderer2
  ) {}
  @ViewChild('localVideo') videoRef: any;
  @ViewChild('localVideo') localVideo: any;

  conversationFormGroup = this.fb.group({
    name: this.fb.control('', [Validators.required]),
  });
  get conversationNameFc(): FormControl {
    return this.conversationFormGroup.get('name') as FormControl;
  }
  conversation: any;
  remotesCounter = 0;

  ngOnInit(): void {}

  createConversation() {
    // let localStream: any;

    // CREATE USER AGENT

    let userAgent = new UserAgent({
      // uri: 'apiKey:33f0724385fbd7087746cbca2d8daf09',
      uri: 'apiKey:43b9b76afd37e9ab4eb37c4985417750',
    });

    // REGISTER

    userAgent.register().then((session: Session) => {
      // CREATE CONVERSATION
      const conversation: Conversation = session.getConversation(
        this.conversationNameFc.value
      );
      this.conversation = conversation;

      // ADD EVENT LISTENER : WHEN NEW STREAM IS AVAILABLE IN CONVERSATION
      conversation.on('streamListChanged', (streamInfo: any) => {
        this.numberOfPerticipant = streamInfo.contact.groups.length;

        if (streamInfo.listEventType === 'added') {
          if (streamInfo.isRemote === true) {
            conversation
              .subscribeToMedia(streamInfo.streamId)
              .then((stream: Stream) => {
                console.log('subscribeToMedia success', stream);
              })
              .catch((err) => {
                console.error('subscribeToMedia error', err);
              });
          }
        }
      });
      // BIS/ ADD EVENT LISTENER : WHEN STREAM IS ADDED/REMOVED TO/FROM THE CONVERSATION
      conversation
        .on('streamAdded', (stream: Stream) => {
          this.remotesCounter += 1;
          stream.addInDiv(
            'remote-container',
            'remote-media-' + stream.streamId,
            {},
            false
          );
        })
        .on('streamRemoved', (stream: any) => {
          this.remotesCounter -= 1;
          stream.removeFromDiv(
            'remote-container',
            'remote-media-' + stream.streamId
          );
        });

      // 5/ CREATE LOCAL STREAM

      navigator.mediaDevices
        .getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
          },
          video: true,
        })
        .then(function (stream) {
          // Use the stream as desired
          var audioTracks = stream.getAudioTracks();
          var videoTracks = stream.getVideoTracks();
          console.log('using audio device: ' + audioTracks[0].label);
          console.log('using video device: ' + videoTracks[0].label);
        })
        .catch(function (error) {
          console.log('Error: ' + error);
        });

      userAgent
        .createStream({
          constraints: {
            audio: {
              noiseSuppression: true,
              echoCancellation: true,
            },
            video: true,
          },
        })
        .then((stream: Stream) => {
          console.log('createStream :', stream);

          this._snackBar.open('Stream Created Successfully', 'Close', {
            duration: 200,
          });

          // Save local stream
          this.localStream = stream;

          // Display stream
          this.localStream.attachToElement(this.videoRef.nativeElement);

          // JOIN CONVERSATION
          conversation
            .join()
            .then(() => {
              //  PUBLISH LOCAL STREAM
              conversation
                .publish(this.localStream)
                .then((stream: Stream) => {
                  console.log('published', stream);
                })
                .catch((err: any) => {
                  console.error('publish error', err);
                });
            })
            .catch((err: any) => {
              console.error('Conversation join error', err);
            });
        })
        .catch((err: any) => {
          console.error('create stream error', err);
        });
    });
  }
  // to end call
  endCall() {
    this.conversation
      .leave()
      .then(() => {
        this.conversation.destroy();
        this._snackBar.open('Call ended', 'Close');
      })
      .then(() => {
        location.reload();
        this.router.navigate(['/']);
      });
  }
  // to record screen
  record() {
    this.conversation
      .startRecording()
      .then((recordingInfo: any) => {
        this.recordingBtnState = true;
        this._snackBar.open('Recording start', 'Close');
        console.log('Recording start', recordingInfo);
      })
      .catch((error: any) => {
        console.log(error);
      });
  }

  // to stop
  stopRecord() {
    this.conversation
      .stopRecording()
      .then((recordingInfo: any) => {
        this.recordingBtnState = false;
        this._snackBar.open('Recording stopped', 'Close');
        this.conversation.on('recordingAvailable', (recordingInfo: any) => {
          this.recordedUrl = recordingInfo.mediaURL;
        });
      })
      .catch((error: any) => {
        console.log('stop recording', error);
      });
  }

  // to start sharing the screen
  sharingScreen() {
    Stream.createScreensharingStream()
      .then((localStream) => {
        this.conversation
          .publish(localStream)
          .then((publishedStream: any) => {
            console.log(publishedStream);
          })
          .catch((error: any) => {});
      })
      .catch((error) => {
        console.log(error);
      });
  }
  muteMyVideo() {
    this.localStream.muteVideo();
    this.muteVideo = true;
    this._snackBar.open('Video Muted', 'Close');
  }
  unmuteMyVideo() {
    this.localStream.unmuteVideo();
    this.muteVideo = false;
    this._snackBar.open('Video Unmuted', 'Close');
  }
  muteMyAudio() {

    this.localStream.muteAudio();
    this.muteAudio = true;
    this._snackBar.open('Audio Muted', 'Close');
  }
  unmuteMyAudio() {
    this.localStream.unmuteAudio();
    this.muteAudio = false;
    this._snackBar.open('Audio Unmuted', 'Close');
  }
  makeFullScreen(){    this.localVideo.nativeElement.requestFullscreen();

  }
 public gridNumber=1;
 setGrid(gridNumber: number) {
  this.gridNumber = gridNumber;
  const remoteContainer = document.getElementById('remote-container');
  const localContainer = document.getElementById('local-container');
  const buttons = document.getElementsByTagName('button');
  // Remove all grid classes from remote container
  this.renderer.removeClass(remoteContainer, 'grid-layout-1');
  this.renderer.removeClass(remoteContainer, 'grid-layout-2');
  this.renderer.removeClass(remoteContainer, 'grid-layout-3');
  this.renderer.removeClass(localContainer, 'grid-layout-1-local');
  this.renderer.removeClass(localContainer, 'grid-layout-2-local');
  this.renderer.removeClass(localContainer, 'grid-layout-3-local');
  // Add selected grid class to remote container
  this.renderer.addClass(remoteContainer, 'grid-layout-' + gridNumber);
  this.renderer.addClass(localContainer, 'grid-layout-' + gridNumber + '-local');
}
}
