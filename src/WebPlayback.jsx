import React, { useState, useEffect } from "react";

const track = {
  name: "",
  album: {
    images: [{ url: "" }],
  },
  artists: [{ name: "" }],
};

//TODO: Maintain play controls even after switching to controls on native spotify(original device).
/*FIXME: When disconnecting from device, getting Runtime Error("Cannot read properties of null (reading 'album')")
 * Can not seamlessly switch between devices. Have issues where WebPlayer does not show up when switching multiple times.
 * Queue is getting reset/messed up when switching back to device.
 */

function WebPlayback(props) {
  const [player, setPlayer] = useState(undefined);
  const [is_paused, setPaused] = useState(false);
  const [is_active, setActive] = useState(false);
  const [current_track, setTrack] = useState(track);

  useEffect(() => {
    // check if script is already loaded to prevent unncessary multiple times loading
    if (!document.getElementById("spotify-player-script")) {
      const script = document.createElement("script");
      script.id = "spotify-player-script";
      script.src = "https://sdk.scdn.co/spotify-player.js";
      script.async = true;

      document.body.appendChild(script);
    }

    // This function will be called when the component unmounts or before the effect re-runs
    const cleanup = () => {
      // Disconnect the player if it's connected
      if (window.Spotify && player) {
        player.disconnect();
      }
      // Remove the callback to prevent it from being called multiple times
      window.onSpotifyWebPlaybackSDKReady = null;
    };

    //const uniqueDeviceName = `MusicJournal-${Date.now()}`;
    window.onSpotifyWebPlaybackSDKReady = () => {
      console.log("CREATING NEW PLAYER");
      const player = new window.Spotify.Player({
        name: "Music Journal",
        getOAuthToken: (cb) => {
          cb(props.token);
        },
        volume: 0.5,
      });

      setPlayer(player);

      player.addListener("ready", ({ device_id }) => {
        console.log("Ready with Device ID", device_id);
      });

      player.addListener("not_ready", ({ device_id }) => {
        console.log("Device ID has gone offline", device_id);
      });

      player.addListener("player_state_changed", (state) => {
        if (!state) {
          console.log("State is null, resetting track information");
          setTrack(track);
          setPaused(true);
          setActive(false);
          return;
        }

        setTrack(state.track_window.current_track);
        setPaused(state.paused);

        player.getCurrentState().then((state) => {
          !state ? setActive(false) : setActive(true);
        });
      });

      player.addListener("ready", ({ device_id }) => {
        console.log("The Web Playback SDK is ready to play music!");
        console.log("Device ID", device_id);
      });

      player.connect();
    };

    return cleanup;
  }, [props.token, player]);

  return (
    <>
      <div className="container">
        <div className="main-wrapper">
          {/* Conditional rendering to ensure current_track and its properties are not null */}
          {current_track && current_track.album && current_track.album.images.length > 0 ? (
            <img src={current_track.album.images[0].url} className="now-playing__cover" alt="" />
          ) : (
            // Render a placeholder or nothing if current_track is not ready
            <div className="now-playing__cover-placeholder"></div>
          )}

          <div className="now-playing__side">
            <div className="now-playing__name">{current_track ? current_track.name : "No track playing"}</div>
            <div className="now-playing__artist">
              {current_track && current_track.artists.length > 0 ? current_track.artists[0].name : "Unknown artist"}
            </div>

            <button
              className="btn-spotify"
              onClick={() => {
                player && player.previousTrack();
              }}
            >
              &lt;&lt;
            </button>

            <button
              className="btn-spotify"
              onClick={() => {
                player && player.togglePlay();
              }}
            >
              {is_paused ? "PLAY" : "PAUSE"}
            </button>

            <button
              className="btn-spotify"
              onClick={() => {
                player && player.nextTrack();
              }}
            >
              &gt;&gt;
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default WebPlayback;
