"""M4 vehicle art: the M5 packer (crop, resize, convert — never paint) pointed at this folder's catalog."""
import sys
from pathlib import Path

sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "m5"))
import pack  # noqa: E402

pack.HERE = Path(__file__).resolve().parent

if __name__ == "__main__":
    pack.main()
